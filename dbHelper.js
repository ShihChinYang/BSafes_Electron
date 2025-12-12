const dbHelper = {
    dbAll: (db, command) => {
        return new Promise(async (resolve) => {
            let result;
            db.all(command, (error, rows) => {
                if(error){
                    result ={status: "error", error}
                    resolve(result)
                    return;
                }
                resolve({status:"ok", rows})
            });
        });
    },
    dbGet: (db, command) => {
        return new Promise(async (resolve) => {
            let result;
            db.get(command, (error, row) => {
                if(error){
                    result ={status: "error", error}
                    resolve(result)
                    return;
                }
                resolve({status:"ok", row})
            });
        });
    },
    dbRun: (db, command) => {
        return new Promise(async (resolve) => {
            let result;
            db.run(command, (error) => {
                if(error){
                    result ={status: "error", error}
                    console.log(`sqlite command:" ${command}" failed:`, error)
                    resolve(result)
                    return;
                }
                resolve({status:"ok"})
            });
        });
    }
}

module.exports = dbHelper;