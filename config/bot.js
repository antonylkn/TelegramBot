var TelegramBot = require('node-telegram-bot-api');
var settings = require('./settings'); 

var bot = new TelegramBot(settings.botToken, {polling: true});
bot.on("polling_error", console.log);


module.exports = bot;