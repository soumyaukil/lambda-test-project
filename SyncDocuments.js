var fetch = require('isomorphic-fetch');
var Dropbox = require('dropbox').Dropbox;
var mysql = require('mysql');

// Prepare database connection object.
const prepareDatabaseConnectionObject = function() {
    var connection = mysql.createConnection({
        host: "<hostname>",
        user: "<username>",
        password: "<password>",
        database: "<database name>",
    });
    return connection;
}

//Insert a new file metadata in Documents table in database.
const insertIntoDatabase = function(data) {
    return new Promise((resolve, reject) => {
        var connection = prepareDatabaseConnectionObject();
        const params = "('" + data.id + "','" + data.filestore + "','" + data.fsCode + "','" + data.path + "','" + data.status + "')";
        const query = "insert into Documents(id,filestore,fsCode,path,status) values " + params;
        connection.query(query, function(error, results, fields) {
            if (error) {
                connection.destroy();
                throw error;
            } else {
                resolve({
                    data: results
                });
                connection.destroy();
            }
        });
    });
};

// Update status column of file metadata in Documents table in database.
const updateIntoDatabase = function(data) {
    return new Promise((resolve, reject) => {
        var connection = prepareDatabaseConnectionObject();
        const query = "update Documents set status = '" + data.status + "' where id='" + data.id + "'";
        connection.query(query, function(error, results, fields) {
            if (error) {
                connection.destroy();
                throw error;
            } else {
                resolve({
                    data: results
                });
                connection.destroy();
            }
        });
    });
};


//Get All file metadata from Documents database table
const getAllDocumentsFromDatabase = function() {
    return new Promise((resolve, reject) => {
        var connection = prepareDatabaseConnectionObject();

        connection.query('select * from Documents', function(error, results, fields) {
            if (error) {
                connection.destroy();
                throw error;
            } else {
                resolve({
                    data: results
                });
                connection.destroy();
            }
        });
    });
};

//Get All file metadata from drop box
const getAllFileMetadataFromDropbox = function(token) {
    return new Promise((resolve, reject) => {
        var dbx = new Dropbox({
            accessToken: token,
            fetch: fetch
        });
        dbx.filesListFolder({
                path: ''
            })
            .then(function(response) {
                resolve({
                    data: response.entries
                });
            })
            .catch(function(error) {
                console.log(error);
            })
    });
};


exports.handler = (event, context, callback) => {
    (async () => {
        const databaseData = await getAllDocumentsFromDatabase();
        const dropboxData = await getAllFileMetadataFromDropbox(event.body.token);

        for (var i = 0; i < databaseData.data.length; ++i) {
            for (var j = 0; j < dropboxData.data.length; ++j) {
                if (databaseData.data[i].id === dropboxData.data[j].id) {
                    // File found. Setting status to Synced
                    let data = {
                        id: dropboxData.data[j].id,
                        status: 'Synced'
                    };
                    const updateIntoDb = await updateIntoDatabase(data);
                    break;
                }
            }
            console.log(j + " " + dropboxData.data.length);
            if (j === dropboxData.data.length) {
                // File not found in db. May have been deleted.
                let data = {
                    id: databaseData.data[i].id,
                    status: 'Archieved'
                };
                const updateIntoDb = await updateIntoDatabase(data);
            }
        }

        // Now search all new files from dropbox file meta-data list.
        for (var i = 0; i < dropboxData.data.length; ++i) {
            for (var j = 0; j < databaseData.data.length; ++j) {
                if (databaseData.data[j].id === dropboxData.data[i].id) {
                    break;
                }
            }
            if (j === databaseData.data.length) {
                var data = {
                    id: dropboxData.data[i].id,
                    filestore: 'Dropbox',
                    fsCode: '1',
                    path: dropboxData.data[i].path_display,
                    status: 'New'
                };
                const insertIntoDb = await insertIntoDatabase(data);
            }
        }
        callback(null, {
            message: "Synced successfully."
        });
    })();
};
