var mysql = require('mysql');

exports.handler = (event, context, callback) => {
    var connection = mysql.createConnection({
    host: "<hostname>",
    user: "<username>",
    password: "<password>",
    database: "<database name>",
});
    connection.query('select * from Documents', function (error, results, fields) {
        if (error) {
            connection.destroy();
            //connection.end();
            throw error;
        } else {
            // connected!
            console.log(results);
            callback(error, results);
            connection.destroy();
            connection.end(function (err) { callback(err, results);});
        }
    });
};
