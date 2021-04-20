var mysql = require('mysql');
var settings = require('./settings'); 

var dbconnection = mysql.createConnection({
  host     : settings.mysql.host,
  user     : settings.mysql.username,
  password : settings.mysql.password,
  database : settings.mysql.database
});
dbconnection.connect();

module.exports = dbconnection;