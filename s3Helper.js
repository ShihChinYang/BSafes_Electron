const fs = require('fs');
const { arrayBuffer } = require('stream/consumers');
var s3ObjectFolderPath = __dirname + '/s3Objects/';

const s3Helper = {
    fsPutS3Object: (s3Key, data) => {
        return new Promise(async (resolve) => {
            const path = s3ObjectFolderPath + s3Key;
            try{
                if(fs.existsSync(path)) {
                    resolve({status:"ok", comment: "The object already exists."});
                    return;
                }       
                fs.writeFileSync(path, data, {encoding:'binary'});
                resolve({status:"ok"});
            } catch (error) {
                console.log("fsPutS3Object failed: ", error);
                resolve({status:"error", error});
            }  
        });
    },
    fsGetS3Object: (s3Key) => {
        return new Promise(async (resolve) => {
            const path = s3ObjectFolderPath + s3Key;
            try{
                if(!fs.existsSync(path)) {
                    resolve({status:"error", error: "The object doesn't exist."});
                    return;
                }       
                const data = fs.readFileSync(path, {encoding:'binary'});
                resolve({status:"ok", data});
            } catch (error) {
                console.log("fsGetS3Object failed: ", error);
                resolve({status:"error", error});
            }  
        });
    }
}

module.exports = s3Helper;