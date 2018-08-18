var mysql = require('mysql');
var fetch = require('isomorphic-fetch');
var Dropbox = require('dropbox').Dropbox;

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

//Get All file metadata from Documents database table
const getFileMetdataFromDatabase = function(fileId) {
    return new Promise((resolve, reject) => {
        var connection = prepareDatabaseConnectionObject();

        connection.query("select * from Documents where id='" + fileId + "'", function(error, results, fields) {
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
const getDropboxDownloadLinkForAFile = function(token, filePath) {
    return new Promise((resolve, reject) => {
        var dbx = new Dropbox({
            accessToken: token,
            fetch: fetch
        });
        dbx.filesGetTemporaryLink({
                path: filePath
            })
            .then(function(response) {
                resolve({
                    data: response.link
                });
            })
            .catch(function(error) {
                console.log(error);
            })
    });
};


exports.handler = (event, context, callback) => {
    (async () => {

        if (typeof(event.body.id) === "undefined") {
            callback(null, "Please specify Id of document.");
            return;
        }
        var fileMetadata = await getFileMetdataFromDatabase(event.body.id);

        // We expect only one file to be present for a give fileId
        console.log(fileMetadata);
        if (fileMetadata.data.length > 0) {
            fileMetadata = fileMetadata.data[0];
            if ((fileMetadata.status === 'New' || fileMetadata.status === 'Synced') && typeof(event.body.token) != "undefined") {
                const fileDownloadLink = await getDropboxDownloadLinkForAFile(event.body.token, fileMetadata.path);
                fileMetadata.link = fileDownloadLink.data
            }
        }
        callback(null, fileMetadata);
    })();

};
