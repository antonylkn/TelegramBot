var dbconnection = require('../config/database');

exports.updateProduct = function (updateData, callback) {
    var updateQuery = "UPDATE product SET amount = " + updateData.amount + " WHERE id=" + updateData.productID;
    dbconnection.query(updateQuery, function (err, rows, fields) {
        if (err) {
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

exports.getProduct = function (keyData, callback) {
    console.log({keyData})
    var query = "SELECT * FROM product WHERE " + Object.keys(keyData)[0] + "='"+  `${keyData[Object.keys(keyData)[0]]}'`;
    dbconnection.query(query, function (err, rows, fields) {
        if (err) {
            console.log({err})
            return callback(err, null);
        }else{
            var return_data = {
                res: true,
                content: rows[0]
            }
            return callback(null, return_data);
        }
    });
}

exports.getAllProduct = function (keyData, callback) {
    var query = "SELECT * FROM product WHERE 1";
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

exports.insertProduct = function (insertData, callback) {
    var insertQuery = "INSERT INTO product (`name`, `amount`, `price`, `description`, `sellerAddress`) VALUES ('" + insertData.name + "', '" + insertData.amount + "', '" + insertData.price + "', '" + insertData.description + "', '" + insertData.sellerAddress + "')";
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
