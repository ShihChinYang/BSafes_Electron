const { app } = require('electron')
const fs = require('fs');
const path = require('node:path');

var dataFolder = 'localBackupData';
var dataFolderPath = path.join(app.getPath('userData'), dataFolder); 
var s3ObjectFolderPath = dataFolderPath;

const s3Helper = {
    dataFolderPath: dataFolderPath,
    fsPutS3Object: (s3Key, data) => {
        return new Promise(async (resolve) => {
            const filePath = path.join(s3ObjectFolderPath, s3Key);
            try{
                if(fs.existsSync(filePath)) {
                    resolve({status:"ok", comment: "The object already exists."});
                    return;
                }       
                fs.writeFileSync(filePath, data, {encoding:'binary'});
                resolve({status:"ok"});
            } catch (error) {
                console.log("fsPutS3Object failed: ", error);
                resolve({status:"error", error});
            }  
        });
    },
    fsIsS3ObjectExisted: (s3Key) => {
        return new Promise(async (resolve) => {
            const filePath = path.join(s3ObjectFolderPath, s3Key);
            try{
                if(fs.existsSync(filePath)) {
                    resolve({status:"ok", existed: true});
                } else {
                    resolve({status:"ok", existed: false});
                }    
            } catch (error) {
                console.log("fsIsS3ObjectExisted failed: ", error);
                resolve({status:"error", error});
            }  
        });
    },
    fsGetS3Object: (s3Key) => {
        return new Promise(async (resolve) => {
            const filePath = path.join(s3ObjectFolderPath, s3Key);
            try{
                if(!fs.existsSync(filePath)) {
                    resolve({status:"error", error: "The object doesn't exist."});
                    return;
                }       
                const data = fs.readFileSync(filePath, {encoding:'binary'});
                resolve({status:"ok", data});
            } catch (error) {
                console.log("fsGetS3Object failed: ", error);
                resolve({status:"error", error});
            }  
        });
    }
}

module.exports = s3Helper;