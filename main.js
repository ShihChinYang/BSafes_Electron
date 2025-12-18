const { app, BrowserWindow, ipcMain } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const fs = require('fs');

const { dbAll, dbGet, dbRun } = require("./dbHelper.js")
const { fsGetS3Object, fsPutS3Object, fsIsS3ObjectExisted } = require("./s3Helper.js")

var s3ObjectFolderPath = __dirname + '/s3Objects/';
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
            let db = new sqlite3.Database(joinedDbFile, async (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Connected to the BSafes SQlite database.');
                global.sqliteDB = db;
                let command;

                let response;

                const createItemKeysTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS itemKeys (" +
                        "key TEXT PRIMARY KEY , downloaded INTEGER); ";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS itemKeys: ", response);
                }
                const createItemVersionsTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS itemVersions (" +
                        "id TEXT, " +
                        "version INTEGER, " +
                        "accumulatedAttachments TEXT, " +
                        "accumulatedGalleryImages TEXT, " +
                        "accumulatedS3ObjectsInContent TEXT, " +
                        "attachments TEXT, " +
                        "audios TEXT, " +
                        "container TEXT, " +
                        "content TEXT, " +
                        "contentSize INTEGER, " +
                        "createdTime INTEGER, " +
                        "dbSize INTEGER, " +
                        "displayName TEXT, " +
                        "downloaded INTEGER, " +
                        "envelopeIV TEXT, " +
                        "images TEXT, " +
                        "ivEnvelope TEXT, " +
                        "ivEnvelopeIV TEXT, " +
                        "keyEnvelope TEXT, " +
                        "keyVersion INTEGER, " +
                        "masterId TEXT, " +
                        "memberName TEXT, " +
                        "originalContainer TEXT, " +
                        "originalPosition INTEGER, " +
                        "owner TEXT, " +
                        "pageDate TEXT, " +
                        "pageNumber INTEGER, " +
                        "path TEXT, " +
                        "position INTEGER, " +
                        "s3ObjectsInContent TEXT, " +
                        "s3ObjectsSizeInContent INTEGER, " +
                        "signedContentUrl TEXT, " +
                        "sizeVersions TEXT, " +
                        "space TEXT, " +
                        "tags TEXT, " +
                        "tagsTokens TEXT, " +
                        "title TEXT, " +
                        "titleTokens TEXT, " +
                        "totalItemVersions INTEGER, " +
                        "totalSize INTEGER, " +
                        "totalStorage INTEGER, " +
                        "type TEXT, " +
                        "updateType TEXT, " +
                        "updatedBy TEXT, " +
                        "usage TEXT, " +
                        "videos TEXT, " +
                        "PRIMARY KEY (id, version)" +
                        ");";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS itemVersions: ", response);
                }
                const createItemsTable = async () => {
                    command = "CREATE TABLE IF NOT EXISTS items (" +
                        "id TEXT PRIMARY KEY , " +
                        "version INTEGER, " +
                        "container TEXT, " +
                        "envelopeIV TEXT, " +
                        "ivEnvelope TEXT, " +
                        "ivEnvelopeIV TEXT, " +
                        "keyEnvelope TEXT, " +
                        "keyVersion INTEGER, " +
                        "pageDate TEXT, " +
                        "pageNumber INTEGER, " +
                        "position INTEGER, " +
                        "space TEXT, " +
                        "tags TEXT, " +
                        "tagsTokens TEXT, " +
                        "title TEXT, " +
                        "titleTokens TEXT, " +
                        "type TEXT" +
                        "); ";
                    response = await dbRun(db, command);
                    console.log("CREATE TABLE IF NOT EXISTS items: ", response);
                }
                await createItemKeysTable();
                await createItemVersionsTable();
                await createItemsTable();

            });
            return db;
        });
    }
    const setupDesktopAPIs = (db) => {
        const addAnItemVersion = async (event, key, itemVersion) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("addAnItemVersion");
                const updateAnItem = () => {
                    return new Promise(async (resolve, reject) => {
                        const prepareInsertCommand = () => {
                            let command = "INSERT INTO items (";
                            command += "id, version";
                            if (itemVersion.container) command += ", container";
                            if (itemVersion.envelopeIV) command += ", envelopeIV";
                            if (itemVersion.ivEnvelope) command += ", ivEnvelope";
                            if (itemVersion.ivEnvelopeIV) command += ", ivEnvelopeIV";
                            if (itemVersion.keyEnvelope) command += ", keyEnvelope";
                            if (itemVersion.keyVersion) command += ", keyVersion";
                            if (itemVersion.pageDate) command += ", pageDate";
                            if (itemVersion.pageNumber) command += ", pageNumber";
                            if (itemVersion.position) command += ", position";
                            if (itemVersion.space) command += ", space";
                            if (itemVersion.tags) command += ", tags";
                            if (itemVersion.tagsTokens) command += ", tagsTokens";
                            if (itemVersion.title) command += ", title";
                            if (itemVersion.titleTokens) command += ", titleTokens";
                            if (itemVersion.type) command += ", type";

                            command += ") VALUES (";
                            command += `'${itemVersion.id}', ${itemVersion.version}`;
                            if (itemVersion.container) command += `, '${JSON.stringify(itemVersion.container)}'`;
                            if (itemVersion.envelopeIV) command += `, '${JSON.stringify(itemVersion.envelopeIV)}'`;
                            if (itemVersion.ivEnvelope) command += `, '${JSON.stringify(itemVersion.ivEnvelope)}'`;
                            if (itemVersion.ivEnvelopeIV) command += `, '${JSON.stringify(itemVersion.ivEnvelopeIV)}'`;
                            if (itemVersion.keyEnvelope) command += `, '${JSON.stringify(itemVersion.keyEnvelope)}'`;
                            if (itemVersion.keyVersion) command += `, ${JSON.stringify(itemVersion.keyVersion)}`;
                            if (itemVersion.pageDate) command += `, '${JSON.stringify(itemVersion.pageDate)}'`;
                            if (itemVersion.pageNumber) command += `, ${JSON.stringify(itemVersion.pageNumber)}`;
                            if (itemVersion.position) command += `, ${JSON.stringify(itemVersion.position)}`;
                            if (itemVersion.space) command += `, '${JSON.stringify(itemVersion.space)}'`;
                            if (itemVersion.tags) command += `, '${JSON.stringify(itemVersion.tags)}'`;
                            if (itemVersion.tagsTokens) command += `, '${JSON.stringify(itemVersion.tagsTokens)}'`;
                            if (itemVersion.title) command += `, '${JSON.stringify(itemVersion.title)}'`;
                            if (itemVersion.titleTokens) command += `, '${JSON.stringify(itemVersion.titleTokens)}'`;
                            if (itemVersion.type) command += `, '${JSON.stringify(itemVersion.type)}'`;
                            command += ")";
                            //console.log(command);
                            return command;
                        }
                        const preapreUpdateCommand = () => {
                            let command = "UPDATE items SET ";
                            command += `version = ${itemVersion.version}`;
                            if (itemVersion.container) command += `, container = '${JSON.stringify(itemVersion.container)}'`;
                            if (itemVersion.envelopeIV) command += `, envelopeIV = '${JSON.stringify(itemVersion.envelopeIV)}'`;
                            if (itemVersion.ivEnvelope) command += `, ivEnvelope = '${JSON.stringify(itemVersion.ivEnvelope)}'`;
                            if (itemVersion.ivEnvelopeIV) command += `, ivEnvelopeIV = '${JSON.stringify(itemVersion.ivEnvelopeIV)}'`;
                            if (itemVersion.keyEnvelope) command += `, keyEnvelope = '${JSON.stringify(itemVersion.keyEnvelope)}'`;
                            if (itemVersion.keyVersion) command += `, keyVersion = ${JSON.stringify(itemVersion.keyVersion)}`;
                            if (itemVersion.pageDate) command += `, pageDate = '${JSON.stringify(itemVersion.pageDate)}'`;
                            if (itemVersion.pageNumber) command += `, pageNumber = ${JSON.stringify(itemVersion.pageNumber)}`;
                            if (itemVersion.position) command += `, position = ${JSON.stringify(itemVersion.position)}`;
                            if (itemVersion.space) command += `, space = '${JSON.stringify(itemVersion.space)}'`;
                            if (itemVersion.tags) command += `, tags = '${JSON.stringify(itemVersion.tags)}'`;
                            if (itemVersion.tagsTokens) command += `, tagsTokens = '${JSON.stringify(itemVersion.tagsTokens)}'`;
                            if (itemVersion.title) command += `, title = '${JSON.stringify(itemVersion.title)}'`;
                            if (itemVersion.titleTokens) command += `, titleTokens = '${JSON.stringify(itemVersion.titleTokens)}'`;
                            if (itemVersion.type) command += `, type = '${JSON.stringify(itemVersion.type)}'`;
                            command += `WHERE id = '${itemVersion.id}'`;
                            return command;
                        }
                        let response = await dbGet(db, `SELECT * FROM items WHERE id="${itemVersion.id}"`)
                        let command;
                        if (response.status === "ok" && !response.row) {
                            command = prepareInsertCommand();
                        } else if (response.status === "ok") {
                            command = preapreUpdateCommand();
                        } else {
                            resolve(response);
                            return;
                        }
                        response = await dbRun(db, command);
                        resolve(response);
                    });
                }
                const updateAnItemVersion = () => {
                    return new Promise(async (resolve, reject) => {
                        const prepareCommand = () => {
                            let command = "INSERT INTO itemVersions (";
                            command += "id, version, downloaded";
                            if (itemVersion.accumulatedAttachments) command += ", accumulatedAttachments";
                            if (itemVersion.accumulatedGalleryImages) command += ", accumulatedGalleryImages";
                            if (itemVersion.accumulatedS3ObjectsInContent) command += ", accumulatedS3ObjectsInContent";
                            if (itemVersion.attachments) command += ", attachments";
                            if (itemVersion.audios) command += ", audios";
                            if (itemVersion.container) command += ", container";
                            if (itemVersion.content) command += ", content";
                            if (itemVersion.contentSize) command += ", contentSize";
                            if (itemVersion.createdTime) command += ", createdTime";
                            if (itemVersion.dbSize) command += ", dbSize";
                            if (itemVersion.displayName) command += ", displayName";
                            if (itemVersion.envelopeIV) command += ", envelopeIV";
                            if (itemVersion.images) command += ", images";
                            if (itemVersion.ivEnvelope) command += ", ivEnvelope";
                            if (itemVersion.ivEnvelopeIV) command += ", ivEnvelopeIV";
                            if (itemVersion.keyEnvelope) command += ", keyEnvelope";
                            if (itemVersion.keyVersion) command += ", keyVersion";
                            if (itemVersion.masterId) command += ", masterId";
                            if (itemVersion.memberName) command += ", memberName";
                            if (itemVersion.originalContainer) command += ", originalContainer";
                            if (itemVersion.originalPosition) command += ", originalPosition";
                            if (itemVersion.owner) command += ", owner";
                            if (itemVersion.pageDate) command += ", pageDate";
                            if (itemVersion.pageNumber) command += ", pageNumber";
                            if (itemVersion.path) command += ", path";
                            if (itemVersion.position) command += ", position";
                            if (itemVersion.s3ObjectsInContent) command += ", s3ObjectsInContent";
                            if (itemVersion.s3ObjectsSizeInContent) command += ", s3ObjectsSizeInContent";
                            if (itemVersion.signedContentUrl) command += ", signedContentUrl";
                            if (itemVersion.sizeVersions) command += ", sizeVersions";
                            if (itemVersion.space) command += ", space";
                            if (itemVersion.tags) command += ", tags";
                            if (itemVersion.tagsTokens) command += ", tagsTokens";
                            if (itemVersion.title) command += ", title";
                            if (itemVersion.titleTokens) command += ", titleTokens";
                            if (itemVersion.totalItemVersions) command += ", totalItemVersions";
                            if (itemVersion.totalSize) command += ", totalSize";
                            if (itemVersion.totalStorage) command += ", totalStorage";
                            if (itemVersion.type) command += ", type";
                            if (itemVersion.update) command += ", updateType";
                            if (itemVersion.updatedBy) command += ", updatedBy";
                            if (itemVersion.usage) command += ", usage";
                            if (itemVersion.videos) command += ", videos";

                            command += ") VALUES (";
                            command += `'${itemVersion.id}', ${itemVersion.version}, 0`;
                            if (itemVersion.accumulatedAttachments) command += `, '${JSON.stringify(itemVersion.accumulatedAttachments)}'`;
                            if (itemVersion.accumulatedGalleryImages) command += `, '${JSON.stringify(itemVersion.accumulatedGalleryImages)}'`;
                            if (itemVersion.accumulatedS3ObjectsInContent) command += `, '${JSON.stringify(itemVersion.accumulatedS3ObjectsInContent)}'`;
                            if (itemVersion.attachments) command += `, '${JSON.stringify(itemVersion.attachments)}'`;
                            if (itemVersion.audios) command += `, '${JSON.stringify(itemVersion.audios)}'`;
                            if (itemVersion.container) command += `, '${JSON.stringify(itemVersion.container)}'`;
                            if (itemVersion.content) command += `, '${JSON.stringify(itemVersion.content)}'`;
                            if (itemVersion.contentSize) command += `, ${JSON.stringify(itemVersion.contentSize)}`;
                            if (itemVersion.createdTime) command += `, ${JSON.stringify(itemVersion.createdTime)}`;
                            if (itemVersion.dbSize) command += `, ${JSON.stringify(itemVersion.dbSize)}`;
                            if (itemVersion.displayName) command += `, '${JSON.stringify(itemVersion.displayName)}'`;
                            if (itemVersion.envelopeIV) command += `, '${JSON.stringify(itemVersion.envelopeIV)}'`;
                            if (itemVersion.images) command += `, '${JSON.stringify(itemVersion.images)}'`;
                            if (itemVersion.ivEnvelope) command += `, '${JSON.stringify(itemVersion.ivEnvelope)}'`;
                            if (itemVersion.ivEnvelopeIV) command += `, '${JSON.stringify(itemVersion.ivEnvelopeIV)}'`;
                            if (itemVersion.keyEnvelope) command += `, '${JSON.stringify(itemVersion.keyEnvelope)}'`;
                            if (itemVersion.keyVersion) command += `, ${JSON.stringify(itemVersion.keyVersion)}`;
                            if (itemVersion.masterId) command += `, '${JSON.stringify(itemVersion.masterId)}'`;
                            if (itemVersion.memberName) command += `, '${JSON.stringify(itemVersion.memberName)}'`;
                            if (itemVersion.originalContainer) command += `, '${JSON.stringify(itemVersion.originalContainer)}'`;
                            if (itemVersion.originalPosition) command += `, ${JSON.stringify(itemVersion.originalPosition)}`;
                            if (itemVersion.owner) command += `, '${JSON.stringify(itemVersion.owner)}'`;
                            if (itemVersion.pageDate) command += `, '${JSON.stringify(itemVersion.pageDate)}'`;
                            if (itemVersion.pageNumber) command += `, ${JSON.stringify(itemVersion.pageNumber)}`;
                            if (itemVersion.path) command += `, '${JSON.stringify(itemVersion.path)}'`;
                            if (itemVersion.position) command += `, ${JSON.stringify(itemVersion.position)}`;
                            if (itemVersion.s3ObjectsInContent) command += `, '${JSON.stringify(itemVersion.s3ObjectsInContent)}'`;
                            if (itemVersion.s3ObjectsSizeInContent) command += `, ${JSON.stringify(itemVersion.s3ObjectsSizeInContent)}`;
                            if (itemVersion.signedContentUrl) command += `, '${JSON.stringify(itemVersion.signedContentUrl)}'`;
                            if (itemVersion.sizeVersions) command += `, '${JSON.stringify(itemVersion.sizeVersions)}'`;
                            if (itemVersion.space) command += `, '${JSON.stringify(itemVersion.space)}'`;
                            if (itemVersion.tags) command += `, '${JSON.stringify(itemVersion.tags)}'`;
                            if (itemVersion.tagsTokens) command += `, '${JSON.stringify(itemVersion.tagsTokens)}'`;
                            if (itemVersion.title) command += `, '${JSON.stringify(itemVersion.title)}'`;
                            if (itemVersion.titleTokens) command += `, '${JSON.stringify(itemVersion.titleTokens)}'`;
                            if (itemVersion.totalItemVersions) command += `, ${JSON.stringify(itemVersion.totalItemVersions)}`;
                            if (itemVersion.totalSize) command += `, ${JSON.stringify(itemVersion.totalSize)}`;
                            if (itemVersion.totalStorage) command += `, ${JSON.stringify(itemVersion.totalStorage)}`;
                            if (itemVersion.type) command += `, '${JSON.stringify(itemVersion.type)}'`;
                            if (itemVersion.update) command += `, '${JSON.stringify(itemVersion.update)}'`;
                            if (itemVersion.updatedBy) command += `, '${JSON.stringify(itemVersion.updatedBy)}'`;
                            if (itemVersion.usage) command += `, '${JSON.stringify(itemVersion.usage)}'`;
                            if (itemVersion.videos) command += `, '${JSON.stringify(itemVersion.videos)}'`;
                            command += ")";
                            //console.log(command);
                            return command;
                        }
                        response = await dbGet(db, `SELECT * FROM itemVersions WHERE id="${itemVersion.id}" AND version=${itemVersion.version}`)
                        if (response.status === "ok" && !response.row) {
                            let command = prepareCommand();
                            let response = await dbRun(db, command);
                            if (response.status === "ok") {
                                response = await dbRun(db, `UPDATE itemKeys SET downloaded = 1 WHERE key = "${key}"`)
                                if (response.status === "ok") {
                                    console.log("Added one itemVersion.")
                                    resolve(response);
                                } else {
                                    resolve({ status: "error", error: "Could not set downloaded = 1" });
                                }
                            } else {
                                resolve(response);
                            }
                        } else if (response.status === "ok") {
                            if (true) {
                                response = await dbRun(db, `UPDATE itemVersions SET container = '${JSON.stringify(itemVersion.container)}', position = ${itemVersion.position} WHERE id = '${itemVersion.id}' AND version = ${itemVersion.version}`)
                                if (response.status === "ok") {
                                    response = await dbRun(db, `UPDATE itemKeys SET downloaded = 1 WHERE key = "${key}"`)
                                    if (response.status === "ok") {
                                        console.log("Updated one itemVersion.")
                                        resolve(response);
                                    } else {
                                        resolve({ status: "error", error: "Could not set downloaded = 1" });
                                    }
                                } else {
                                    resolve({ status: "error", error: "Could not update a version." });
                                }
                            }
                            resolve({ status: "error", error: "The itemVersion already exists." });
                        } else {
                            resolve(response);
                        }
                    });
                }
                try {
                    if (0) {
                        const parseItemVersion = (row) => {
                            let itemVersion;
                            itemVersion = {
                                id: row.id,
                                version: row.version,
                            }
                            if (row.accumulatedAttachments) itemVersion.accumulatedAttachments = JSON.parse(row.accumulatedAttachments);
                            if (row.accumulatedGalleryImages) itemVersion.accumulatedGalleryImages = JSON.parse(row.accumulatedGalleryImages);
                            if (row.accumulatedS3ObjectsInContent) itemVersion.accumulatedS3ObjectsInContent = JSON.parse(row.accumulatedS3ObjectsInContent);
                            if (row.attachments) itemVersion.attachments = JSON.parse(row.attachments);
                            if (row.audios) itemVersion.audios = JSON.parse(row.audios);
                            if (row.container) itemVersion.container = JSON.parse(row.container);
                            if (row.content) itemVersion.content = JSON.parse(row.content);
                            if (row.contentSize) itemVersion.contentSize = JSON.parse(row.contentSize);
                            if (row.createdTime) itemVersion.createdTime = JSON.parse(row.createdTime);
                            if (row.dbSize) itemVersion.dbSize = JSON.parse(row.dbSize);
                            if (row.displayName) itemVersion.displayName = JSON.parse(row.displayName);
                            if (row.envelopeIV) itemVersion.envelopeIV = JSON.parse(row.envelopeIV);
                            if (row.images) itemVersion.images = JSON.parse(row.images);
                            if (row.ivEnvelope) itemVersion.ivEnvelope = JSON.parse(row.ivEnvelope);
                            if (row.ivEnvelopeIV) itemVersion.ivEnvelopeIV = JSON.parse(row.ivEnvelopeIV);
                            if (row.keyEnvelope) itemVersion.keyEnvelope = JSON.parse(row.keyEnvelope);
                            if (row.keyVersion) itemVersion.keyVersion = JSON.parse(row.keyVersion);
                            if (row.masterId) itemVersion.masterId = JSON.parse(row.masterId);
                            if (row.memberName) itemVersion.memberName = JSON.parse(row.memberName);
                            if (row.originalContainer) itemVersion.originalContainer = JSON.parse(row.originalContainer);
                            if (row.originalPosition) itemVersion.originalPosition = JSON.parse(row.originalPosition);
                            if (row.owner) itemVersion.owner = JSON.parse(row.owner);
                            if (row.pageDate) itemVersion.pageDate = JSON.parse(row.pageDate);
                            if (row.pageNumber) itemVersion.pageNumber = JSON.parse(row.pageNumber);
                            if (row.path) itemVersion.path = JSON.parse(row.path);
                            if (row.position) itemVersion.position = JSON.parse(row.position);
                            if (row.s3ObjectsInContent) itemVersion.s3ObjectsInContent = JSON.parse(row.s3ObjectsInContent);
                            if (row.s3ObjectsSizeInContent) itemVersion.s3ObjectsSizeInContent = JSON.parse(row.s3ObjectsSizeInContent);
                            if (row.signedContentUrl) itemVersion.signedContentUrl = JSON.parse(row.signedContentUrl);
                            if (row.sizeVersions) itemVersion.sizeVersions = JSON.parse(row.sizeVersions);
                            if (row.space) itemVersion.space = JSON.parse(row.space);
                            if (row.tags) itemVersion.tags = JSON.parse(row.tags);
                            if (row.tagsTokens) itemVersion.tagsTokens = JSON.parse(row.tagsTokens);
                            if (row.title) itemVersion.title = JSON.parse(row.title);
                            if (row.titleTokens) itemVersion.titleTokens = JSON.parse(row.titleTokens);
                            if (row.totalItemVersions) itemVersion.totalItemVersions = JSON.parse(row.totalItemVersions);
                            if (row.totalSize) itemVersion.totalSize = JSON.parse(row.totalSize);
                            if (row.totalStorage) itemVersion.totalStorage = JSON.parse(row.totalStorage);
                            if (row.type) itemVersion.type = JSON.parse(row.type);
                            if (row.updateType) itemVersion.update = JSON.parse(row.updateType);
                            if (row.updatedBy) itemVersion.updatedBy = JSON.parse(row.updatedBy);
                            if (row.usage) itemVersion.usage = JSON.parse(row.usage);
                            if (row.videos) itemVersion.videos = JSON.parse(row.videos);
                            return { itemVersion };
                        }
                        const compareItemVersion = (item1, item2) => {
                            const allKeys = Object.keys(item1);
                            for (let i = 0; i < allKeys.length; i++) {
                                let key = allKeys[i];
                                let value1 = JSON.stringify(item1[key]);
                                let value2 = JSON.stringify(item2[key]);
                                if (value1 !== value2) {
                                    console.log(`${key} value differs.`);
                                }
                            }
                        }
                    }
                    let response;
                    response = await updateAnItem();
                    if(response.status !== "ok"){
                        resolve(response);
                        return;
                    }
                    response = await updateAnItemVersion();
                    if(response.status !== "ok"){
                        resolve(response);
                        return;
                    }
                    resolve(response);
                } catch (error) {
                    console.log("addAnItemVersion failed: ", error)
                    resolve({ status: "error", error });
                }
            });
        }
        const addItemKeys = async (event, itemList) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("addItemKeys");
                try {

                    for (let i = 0; i < itemList.numberOfItems; i++) {
                        let command;
                        let key = itemList.items[i];
                        command = `SELECT * FROM itemKeys WHERE key="${key}"`
                        let response = await dbGet(db, command);
                        if (response.status === "ok") {
                            if (!response.row) {
                                command = `INSERT INTO itemKeys (key, downloaded) VALUES ("${key}", 0);`
                                response = await dbRun(db, command);
                                if (response.status === "ok") {
                                    console.log("Added one item key.");
                                } else {
                                    console.log("INSERT INTO itemKeys failed: ", response.error);
                                }
                            }
                        }
                    }
                    /*response = await dbAll(db, "SELECT * FROM itemKeys");
                    if (response.status === "ok") {
                        if (response.rows) {
                            response.rows.forEach((row, index) => {
                                console.log(row);
                            })
                        }
                    }*/
                    /*db.each("SELECT * FROM itemKeys", (err, row) => {
                        console.log(row.key + ": " + row.downloaded);
                    });*/
                    resolve({ status: "ok" });
                } catch (error) {
                    resolve({ status: "error", error });
                }
            })
        }
        const finishedDownloadingObjectsForAnItem = async (event, id, version) => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                response = await dbRun(db, `UPDATE itemVersions SET downloaded = 1 WHERE id = "${id}" AND version = ${version}`);
                if (response.status === "ok") {
                    console.log("One item with all objects downloaded.")
                    resolve({ status: "ok" });
                } else {
                    console.log("finishedDownloadingObjectsForAnItem failed: ", response.error)
                    resolve({ status: "error" });
                }
            });
        }
        const getAnItemForDownloadingObjects = async (event, workspace) => {
            return new Promise(async (resolve, reject) => {
                console.log("getAnItemForDownloadingObjects");
                db = global.sqliteDB;
                let currentLevel = 0;
                let containersInLevels = {
                    0: [JSON.stringify(workspace)],
                };
                while (1) {
                    for (let i = 0; i < containersInLevels[currentLevel].length; i++) {
                        let currentContainer = containersInLevels[currentLevel][i];
                        let command = `SELECT * FROM itemVersions WHERE container = '${currentContainer}' AND downloaded = 0 ORDER BY position DESC`;
                        let response = await dbGet(db, command);
                        if (response.status === "ok" && response.row) {
                            const item = response.row;
                            console.log("Container - ", currentContainer);
                            console.log("Item - ", item.id);
                            resolve({ status: "ok", item });
                            return;
                        } else if (response.status === "ok") {
                            let command = `SELECT * FROM itemVersions WHERE container = '${currentContainer}' AND type IN ('"B"', '"F"', '"N"', '"D"') ORDER BY position DESC`;
                            let response = await dbAll(db, command);
                            if (response.status === "ok" && response.rows && response.rows.length) {
                                const nextLevel = currentLevel + 1;
                                let containers = [];
                                for (let i = 0; i < response.rows.length; i++) {
                                    containers.push(JSON.stringify(response.rows[i].id));
                                }
                                if (containersInLevels[nextLevel]) {
                                    containersInLevels[nextLevel].push(containers);
                                } else {
                                    containersInLevels[nextLevel] = containers;
                                }
                            } else if (response.status === "error") {
                                resolve({ status: "error" });
                                return;
                            }
                        } else {
                            resolve(response);
                            return;
                        }
                    }
                    currentLevel++;

                    if (!containersInLevels[currentLevel]) {
                        console.log("The End");
                        break;
                    } else {
                        console.log(`Level ${currentLevel} containers - `);
                    }
                }
                resolve({ status: "ok" })
            });
        }
        const getAnItemKeyForDwonload = async () => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("getAnItemKeyForDwonload");
                try {
                    let response = await dbGet(db, 'SELECT * FROM itemKeys WHERE downloaded = 0');
                    if (response.status === "ok") {
                        if (response.row) {
                            resolve({ status: "ok", key: response.row.key })
                        } else {
                            resolve({ status: "ok" })
                        }
                    } else {
                        resolve({ status: "error", error: response.error })
                    }
                } catch (error) {
                    resolve({ status: "error", error });
                }
            });
        }
        const getLastItemKey = async () => {
            return new Promise(async (resolve, reject) => {
                db = global.sqliteDB;
                console.log("getLastItemKey");
                try {
                    let response;
                    /*response = await fsPutS3Object("123:456:789", "ABC");
                    if(response.status === "ok") {
                        response = await fsGetS3Object("123:456:789");
                    }*/
                    response = await dbGet(db, 'SELECT * FROM itemKeys ORDER BY key DESC');
                    if (response.status === "ok") {
                        if (response.row) {
                            resolve({ status: "ok", key: response.row.key })
                        } else {
                            resolve({ status: "ok" })
                        }
                    } else {
                        resolve({ status: "error", error: response.error })
                    }
                } catch (error) {
                    resolve({ status: "error", error });
                }
            })
        }
        const getS3Object = async (event, s3Key) => {
            return new Promise(async (resolve, reject) => {
                response = await fsGetS3Object(s3Key);
                resolve(response);
            });
        }
        const isS3ObjectExisted = async (event, s3Key) => {
            return new Promise(async (resolve, reject) => {
                response = await fsIsS3ObjectExisted(s3Key);
                resolve(response);
            });
        }
        const putS3Object = async (event, s3Key, data) => {
            return new Promise(async (resolve, reject) => {
                response = await fsPutS3Object(s3Key, data);
                resolve(response);
            });
        }
        ipcMain.handle('ping', () => 'pong');
        ipcMain.handle('addAnItemVersion', addAnItemVersion);
        ipcMain.handle('addItemKeys', addItemKeys);
        ipcMain.handle('finishedDownloadingObjectsForAnItem', finishedDownloadingObjectsForAnItem);
        ipcMain.handle('getAnItemForDownloadingObjects', getAnItemForDownloadingObjects);
        ipcMain.handle('getAnItemKeyForDwonload', getAnItemKeyForDwonload);
        ipcMain.handle('getLastItemKey', getLastItemKey);
        ipcMain.handle('getS3Object', getS3Object);
        ipcMain.handle('isS3ObjectExisted', isS3ObjectExisted);
        ipcMain.handle('putS3Object', putS3Object);
    }
    const setupS3 = () => {
        try {
            if (!fs.existsSync(s3ObjectFolderPath)) {
                fs.mkdirSync(s3ObjectFolderPath);
            }
        } catch (error) {
            console.log("Could not open s3Object folder.");
            return;
        }
    }
    const db = setupDB();
    setupDesktopAPIs(db);
    setupS3();
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

