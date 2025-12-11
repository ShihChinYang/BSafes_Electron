const { app, BrowserWindow, ipcMain } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const fs = require('fs')
var databaseFile = 'BSafes.db';

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        heidht: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.webContents.openDevTools()
    //win.loadFile('hello.html');
    win.loadURL('http://127.0.0.1:3000');
}

const setup = () => {
    const setupDB = () => {
        let joinedDbFile = path.join(__dirname, databaseFile);
        fs.access(joinedDbFile, fs.F_OK, (err) => {
            if (err) {
                //console.error(err)
                fs.closeSync(fs.openSync(joinedDbFile, 'w'));
                //return;
            }
            //file exists
            let db = new sqlite3.Database(joinedDbFile, (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Connected to the BSafes SQlite database.');
                global.sqliteDB = db;
                let command;
                db.serialize(() => {
                    command = "CREATE TABLE IF NOT EXISTS itemKeys (" +
                        "key TEXT PRIMARY KEY , downloaded INTEGER); ";
                    db.run(command);
                });
            });
        });
    }
    const setupDesktopAPIs = () => {
        const getLastItemKey = async (event, itemList) => {
            return new Promise((resolve, reject) => {
                const db = global.sqliteDB;
                console.log("getLastItemKey");
                try {
                    db.get('SELECT * FROM itemKeys ORDER BY key DESC', (err, row) => {
                        if (err) {
                            console.error(err.message);
                            reject({ status: "error", error: err.message })
                            return;
                        }
                        if (row) {
                            resolve({ status: "ok", key: row.key })
                        } else {
                            resolve({ status: "ok" })
                        }
                    });
                } catch (error) {
                    resolve({ status: "error", error });
                }
            })
        }
        const addItemKeys = async (event, itemList) => {
            return new Promise((resolve, reject) => {
                const db = global.sqliteDB;
                console.log("addItemKeys");
                try {
                    db.serialize(() => {
                        for (let i = 0; i < itemList.numberOfItems; i++) {
                            let command;
                            let key = itemList.items[i];
                            command = `SELECT * FROM itemKeys WHERE key="${key}"`
                            db.get(command, (error, row) => {
                                if (err) {
                                    resolve({ status: "error", error });
                                    return;
                                }
                                if (row) {
                                    resolve({ status: "ok" });
                                } else {
                                    command = `INSERT INTO itemKeys (key, downloaded) VALUES ("${key}", 0);`
                                    db.run(command, (error) => {
                                        if (error) {
                                            resolve({ status: "error", error });
                                            return;
                                        }
                                    });
                                }
                            });
                        }
                        db.each("SELECT * FROM itemKeys", (err, row) => {
                            console.log(row.key + ": " + row.downloaded);
                        });
                    });
                    resolve({ status: "ok" });
                } catch (error) {
                    resolve({ status: "error", error });
                }
            })
        }
        ipcMain.handle('ping', () => 'pong');
        ipcMain.handle('getLastItemKey', getLastItemKey);
        ipcMain.handle('addItemKeys', addItemKeys);
    }
    setupDB();
    setupDesktopAPIs()
}

app.whenReady().then(() => {
    createWindow();
    setup();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', () => {
    const db = global.sqliteDB;
    db.close();
    /*if (process.platform !== 'darwin')*/ app.quit();
})

