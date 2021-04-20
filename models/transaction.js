var dbconnection = require('../config/database');

exports.getTransaction = function (keyData, callback) {
    var query = "SELECT * FROM transaction WHERE " + Object.keys(keyData)[0] + "='"+  `${keyData[Object.keys(keyData)[0]]}'`;
    dbconnection.query(query, function (err, rows, fields) {
        if (err) {
            console.log({err})
            return callback(err, null);
        }else{
            var return_data = {
                res: true,
                content: rows
            }
            return callback(null, return_data);
        }
    });
}

exports.insertTransaction = function (insertData, callback) {
    var insertQuery = "INSERT INTO transaction (`buyer`, `seller`, `hash`, `orderID`, `productID`, `type`) VALUES ('" + insertData.buyer + "', '" + insertData.seller + "', '" + insertData.hash + "', '" + insertData.orderID + "', '" + insertData.productID + "', '" + insertData.type + "')";
    dbconnection.query(insertQuery, function (err, rows, fields) {
        if (err) {
            return callback(err, null);
        }
        var return_data = {
            res: true,
            content: rows
        }
        return callback(null, return_data);
    });
}