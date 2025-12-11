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
                db.serialize(() => {
                    
                });
                db.close();
            });
        });
    }

    setupDB();
}

app.whenReady().then(() => {
    ipcMain.handle('ping', () => 'pong')
    createWindow();
    setup();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', () => {
    /*if (process.platform !== 'darwin')*/ app.quit();
})

