const { ipcMain, app } = require('electron')
const sqlite3 = require('sqlite3');
const fsp = require('fs').promises;
const path = require('node:path');

/**
 * The export's manifest database: <export folder>/.bsafes-data/manifest.db
 * One row per exported item (page or container) saying where its folder is in the export, plus
 * what was written there (versions and file fingerprints). It lets the next export move a folder
 * whose item was moved or renamed in the app, instead of unlocking and writing it again.
 *
 * It's kept inside the export folder, so it stays valid when the drive is plugged into another
 * computer or mounted somewhere else. It's only a cache: if it's lost or damaged, it's rebuilt
 * and the pages it can't vouch for are exported again.
 */
const DB_REL_PATH = '.bsafes-data/manifest.db';
const KINDS = new Set(['page', 'container']);

const SCHEMA = `
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        relPath TEXT NOT NULL,
        data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS items_relPath ON items(relPath);
    PRAGMA user_version = 1;
`;

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const get = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const all = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});
const exec = (db, sql) => new Promise((resolve, reject) => db.exec(sql, (err) => (err ? reject(err) : resolve())));
const closeDb = (db) => new Promise((resolve) => db.close(() => resolve()));
const openDb = (file) => new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, (err) => (err ? reject(err) : resolve(db)));
});

const isDamaged = (error) => error && (error.code === 'SQLITE_CORRUPT' || error.code === 'SQLITE_NOTADB');

const transaction = async (db, fn) => {
    await run(db, 'BEGIN IMMEDIATE');
    try {
        const result = await fn();
        await run(db, 'COMMIT');
        return result;
    } catch (error) {
        await run(db, 'ROLLBACK').catch(() => {});
        throw error;
    }
}

const registerExportManifestHandlers = ({ resolveInside, ok, fail }) => {
    // Resolved export folder path -> { db: Promise<Database>, queue: Promise }
    const connections = new Map();

    const open = async (rootPath) => {
        const file = await resolveInside(rootPath, DB_REL_PATH, { createParents: true });
        let db = await openDb(file);
        try {
            await exec(db, SCHEMA);
        } catch (error) {
            await closeDb(db);
            if (!isDamaged(error)) throw error;
            // Damaged: start a new one. Pages it no longer knows about are checked or exported again.
            await fsp.rm(file, { force: true });
            await fsp.rm(file + '-journal', { force: true });
            db = await openDb(file);
            await exec(db, SCHEMA);
        }
        return db;
    }

    const drop = async (key) => {
        const connection = connections.get(key);
        if (!connection) return;
        connections.delete(key);
        try { await closeDb(await connection.db); } catch { }
    }

    // Runs fn(db) for the export folder, one call at a time per folder (so transactions never overlap).
    const withDb = (rootPath, fn) => {
        if (typeof rootPath !== 'string' || !rootPath) return Promise.reject(new Error('Invalid export folder.'));
        const key = path.resolve(rootPath);
        let connection = connections.get(key);
        if (!connection) {
            connection = { db: open(rootPath), queue: Promise.resolve() };
            connection.db.catch(() => {}); // reported to the caller below
            connections.set(key, connection);
        }
        const current = connection;
        const result = current.queue.then(async () => {
            try {
                return await fn(await current.db);
            } catch (error) {
                // For example, the drive was unplugged. Reopen on the next call.
                if (connections.get(key) === current) await drop(key);
                throw error;
            }
        });
        current.queue = result.catch(() => {});
        return result;
    }

    const rowToItem = (row) => {
        if (!row) return null;
        let data = {};
        try { data = JSON.parse(row.data) || {}; } catch { }
        return { ...data, id: row.id, kind: row.kind, relPath: row.relPath };
    }

    const handle = (channel, fn) => ipcMain.handle(channel, async (event, ...args) => {
        try {
            return ok(await fn(...args));
        } catch (error) {
            return fail(error);
        }
    });

    handle('export:dbGetItem', (rootPath, id) => withDb(rootPath, async (db) => {
        if (typeof id !== 'string' || !id) throw new Error('Invalid item id.');
        return { item: rowToItem(await get(db, 'SELECT id, kind, relPath, data FROM items WHERE id = ?', [id])) };
    }));

    handle('export:dbPutItem', (rootPath, item) => withDb(rootPath, async (db) => {
        if (!item || typeof item.id !== 'string' || !item.id) throw new Error('Invalid item id.');
        if (!KINDS.has(item.kind)) throw new Error('Invalid item kind.');
        if (typeof item.relPath !== 'string' || !item.relPath) throw new Error('Invalid item path.');
        const { id, kind, relPath, ...data } = item;
        await run(db, 'INSERT INTO items (id, kind, relPath, data) VALUES (?, ?, ?, ?) '
            + 'ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, relPath = excluded.relPath, data = excluded.data',
            [id, kind, relPath, JSON.stringify(data)]);
        return {};
    }));

    // After a folder was moved from fromRelPath to toRelPath: updates it and everything recorded inside it.
    handle('export:dbMoveItems', (rootPath, fromRelPath, toRelPath) => withDb(rootPath, async (db) => {
        if (typeof fromRelPath !== 'string' || !fromRelPath || typeof toRelPath !== 'string' || !toRelPath) throw new Error('Invalid path.');
        // Paths inside the folder sort between "<from>/" and "<from>0" ('0' comes right after '/').
        const rows = await all(db, 'SELECT id, relPath FROM items WHERE relPath = ? OR (relPath >= ? AND relPath < ?)',
            [fromRelPath, fromRelPath + '/', fromRelPath + '0']);
        await transaction(db, async () => {
            for (const row of rows) {
                await run(db, 'UPDATE items SET relPath = ? WHERE id = ?', [toRelPath + row.relPath.slice(fromRelPath.length), row.id]);
            }
        });
        return { updated: rows.length };
    }));

    // After a complete export: forgets every item not in keepIds.
    handle('export:dbRemoveItemsExcept', (rootPath, keepIds) => withDb(rootPath, async (db) => {
        if (!Array.isArray(keepIds)) throw new Error('Invalid item list.');
        const removed = await transaction(db, async () => {
            await run(db, 'CREATE TEMP TABLE IF NOT EXISTS keepIds (id TEXT PRIMARY KEY)');
            await run(db, 'DELETE FROM keepIds');
            for (const id of keepIds) {
                if (typeof id === 'string') await run(db, 'INSERT OR IGNORE INTO keepIds (id) VALUES (?)', [id]);
            }
            const result = await run(db, 'DELETE FROM items WHERE id NOT IN (SELECT id FROM keepIds)');
            await run(db, 'DELETE FROM keepIds');
            return result.changes;
        });
        return { removed };
    }));

    // Closes the database, so the drive can be ejected. It's reopened on the next call.
    handle('export:dbClose', async (rootPath) => {
        if (typeof rootPath !== 'string' || !rootPath) return {};
        const key = path.resolve(rootPath);
        const connection = connections.get(key);
        if (!connection) return {};
        // Calls from now on open a new connection; this one closes once its queued calls are done.
        connections.delete(key);
        await connection.queue;
        try { await closeDb(await connection.db); } catch { }
        return {};
    });

    app.on('before-quit', () => {
        for (const key of [...connections.keys()]) drop(key);
    });
}

module.exports = { registerExportManifestHandlers };
