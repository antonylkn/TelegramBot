const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const TruffleContract = require('@truffle/contract');
const baseDir = process.cwd();
var settings = require('./config/settings');
/////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////// BOT ACTION ///////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var bot = require('./config/bot');
var productModel = require('./models/product');
var transactionModel = require('./models/transaction');
var dbconnection = require('./config/database');
// Matches "/echo [whatever]"
bot.onText(/\/start/, (msg, match) => {
    const chatId = msg.chat.id;

    let commandText = "Below are useful commands:\n/start - Send everytime when you use the bot or you want to login.\n/exit - Send when you stop using the bot or you want to logout.\n/menu - Send when you want to call the menu.";
    let string = "Welcome to the *Merchant Sales Bot*! \n Are you a _Shopaholic_? \n Do you want to protect your _identity_? \n Shop here and pay your Ether! \n \n" + commandText;

    bot.sendMessage(msg.chat.id, string, {
        "parse_mode" : "Markdown",
        "reply_markup": {
            "inline_keyboard": [
                [
                    {
                        text: "Create Account",
                        callback_data: "createAddress",
                    },
                ],
                [
                    {
                        text: "Login",
                        callback_data: "login",
                    },
                ],
            ],
        },
    });
});

// Search Product Process
let showProduct = (param, msg) => {
    productModel.getProduct(param, function (err, modelResult) {
        var product = modelResult.content;
        if(product) {
            if(product.amount == 0) {
                bot.sendMessage(msg.chat.id, "Stock out!")
            } else {
                bot.sendMessage(msg.chat.id, `Name: ${product.name} \n Description: ${product.description} \n Price: ${product.price} ETH`, {
                    "reply_markup": {
                        "inline_keyboard": [
                            [
                                {
                                    text: "Purchase Product",
                                    callback_data: `purchaseProduct ${product.id}`,
                                },
                            ]
                        ],
                    },
                });
            }
        } else {
            bot.sendMessage(msg.chat.id, "No such products existed.");
        }
    });
}

let searchText = (msg) => {
    let string = "You can search a product by its product ID or name. Type /searchbyid (id) to search product by its ID. Type /searchbyname to search product by its name.";
    bot.sendMessage(msg.chat.id, string)
}

bot.onText(/\/searchbyid (.+)/, (msg, match) => {
    const productId = match[1]
    let results;
    if (!isNumeric(productId))
        bot.sendMessage(msg.chat.id, "Please input valid product ID.");
    else
        results = showProduct({id: productId}, msg);
})

bot.onText(/\/searchbyname (.+)/, (msg, match) => {
    const productName = match[1]
    let results = showProduct({name: productName}, msg)
})

let callMainMenu = (msg) => {
    bot.sendMessage(msg.chat.id, "Please choose your role based on the purpose using the system this time!", {
        "reply_markup": {
            "inline_keyboard": [
                [
                    {
                        text: "Customer",
                        callback_data: "customer",
                    },
                    {
                        text: "Seller",
                        callback_data: "seller",
                    },
                ],
            ],
        },
    })
}

let userStatus;

bot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    if (callbackQuery.data === "customer") {
        userStatus = "customer";
        bot.sendMessage(msg.chat.id, "Choose the function below.\nClick 'Search Product' if you want to purchase.", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {
                            text: "Search Product",
                            callback_data: "search",
                        },
                        {
                            text: "List Products",
                            callback_data: "listProduct",
                        }
                    ],
                    [
                        {
                            text: "Block Explorer",
                            callback_data: "explore buyer",
                        },
                        {
                            text: "Get Balance",
                            callback_data: "getBalance",
                        }
                    ],
                    [
                        {
                            text: "Check Orders",
                            callback_data: "checkOrders buyer",
                        }
                    ]
                ],
            },
        })
    } else if (callbackQuery.data === "seller") {
        userStatus = "seller";
        bot.sendMessage(msg.chat.id, "Choose the function below.", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {
                            text: "Add Products",
                            callback_data: "addProduct",
                        },
                        {
                            text: "List Products",
                            callback_data: "listProduct",
                        }
                    ],
                    [
                        {
                            text: "Block Explorer",
                            callback_data: "explore seller",
                        },
                        {
                            text: "Get Balance",
                            callback_data: "getBalance",
                        }
                    ],
                    [
                        {
                            text: "Check Orders",
                            callback_data: "checkOrders seller",
                        }
                    ],
                ],
            },
        })
    } else if (callbackQuery.data === "createAddress") {
        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => createAddress(msg));
    } else if (callbackQuery.data === "login") {
        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => login(msg));
    }else if (callbackQuery.data === "search") {
        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => searchText(msg));
    } else if (callbackQuery.data === "addProduct") {
        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => addProductText(msg));
    } else if(callbackQuery.data === 'getBalance') {
        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => getBalance(msg));
    } else if(callbackQuery.data.includes("purchaseProduct")) {
        let productId = callbackQuery.data.split(" ")[1];

        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => purchaseProduct(msg, productId));
    } else if(callbackQuery.data.includes('explore')) {
        let accountType = callbackQuery.data.split(" ")[1];

        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => explorTransactions(msg, accountType));
    } else if(callbackQuery.data.includes('checkOrders')) {
        let accountType = callbackQuery.data.split(" ")[1];

        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => getOrderDetails(msg, accountType));
    } else if(callbackQuery.data === 'listProduct') {
        bot.answerCallbackQuery(callbackQuery.id)
            .then(() => listProduct(msg));
    }
});


bot.onText(/\/deliver (.+)/, (msg, match) => {
    let orderID = match[1];
    orderID = parseFloat(orderID) - 1;

    let results = deliverProduct(orderID, msg);
});

bot.onText(/\/confirm (.+)/, (msg, match) => {
    let orderID = match[1];
    orderID = parseFloat(orderID) - 1;
    let results = confirmReceived(orderID, msg);
});

bot.onText(/\/menu/, (msg, match) => {
    // dbconnection.end()
    if (userStatus === "customer") {
        bot.sendMessage(msg.chat.id, "Choose the function below.\nClick 'Search Product' if you want to purchase.", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {
                            text: "Search Product",
                            callback_data: "search",
                        },
                        {
                            text: "List Products",
                            callback_data: "listProduct",
                        }
                    ],
                    [
                        {
                            text: "Block Explorer",
                            callback_data: "explore buyer",
                        },
                        {
                            text: "Get Balance",
                            callback_data: "getBalance",
                        }
                    ],
                    [
                        {
                            text: "Check Orders",
                            callback_data: "checkOrders buyer",
                        }
                    ]
                ],
            },
        })
    } else if (userStatus === "seller") {
        bot.sendMessage(msg.chat.id, "Choose the function below.", {
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {
                            text: "Add Products",
                            callback_data: "addProduct",
                        },
                        {
                            text: "List Products",
                            callback_data: "listProduct",
                        }
                    ],
                    [
                        {
                            text: "Block Explorer",
                            callback_data: "explore seller",
                        },
                        {
                            text: "Get Balance",
                            callback_data: "getBalance",
                        }
                    ],
                    [
                        {
                            text: "Check Orders",
                            callback_data: "checkOrders seller",
                        }
                    ],
                ],
            },
        })
    }
})


let userAccountInfo, userAccountAddress;

bot.onText(/\/exit/, (msg, match) => {
    // dbconnection.end()
    userAccountInfo = null;
    userAccountAddress = null;
    userStatus = null;
    bot.sendMessage(msg.chat.id, "Account Logout!\nEnter /start again to login.\nSee You!")
})

//connect to the blockchain
createAddress = (msg) => {
    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));
    userAccountInfo = web3.eth.accounts.create();
    userAccountAddress = userAccountInfo.address
    bot.sendMessage(
        msg.chat.id, "Public address: " + userAccountAddress +"\nPrivate Key: " + userAccountInfo.privateKey)
    callMainMenu(msg)
}

listProduct = (msg) => {
    productModel.getAllProduct({}, function(error, products) {
        if(products.content.length > 0) {
            let returnString = '';
            products.content.forEach(product => {
                returnString = `${returnString}Product ID: ${product.id} \nName: ${product.name} \nAmount: ${parseFloat(product.amount)} \nPrice: ${product.price} ETH \nDescription: ${product.description} \n--------------------------------\n`;
            });

            bot.sendMessage(msg.chat.id, returnString);
        } else {
            bot.sendMessage(msg.chat.id, "No products yet!");
        }
    })
}

login = (msg) => {
    bot.sendMessage(msg.chat.id, "Please enter your private key to log in your wallet.\n Type /privateKey (your_private_key) to log in.")
}

bot.onText(/\/privateKey (.+)/, (msg, match) => {
    try{
        const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));
        userAccountInfo = web3.eth.accounts.privateKeyToAccount(match[1]);
        if(userAccountInfo) {
            userAccountAddress = userAccountInfo.address
            bot.sendMessage(
                msg.chat.id, "Welcome back, " + userAccountAddress +"!")

            callMainMenu(msg)
        } else {
            bot.sendMessage(
                msg.chat.id, "Wrong private key !")
        }
    } catch(error) {
        bot.sendMessage(
            msg.chat.id, "Wrong private key !")
    }
})

getBalance = async (msg) => {
    if(!userAccountInfo) {
        bot.sendMessage(msg.chat.id, "Please login before check balance!");
        return;
    }

    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));
    let balance = await web3.eth.getBalance(userAccountAddress);
    balance = web3.utils.fromWei(balance, 'ether');
    bot.sendMessage(
        msg.chat.id, "Your balance is " + balance + " ETH");
}

// End Search Product

// Purchase product
purchaseProduct = async (msg, pid) => {
    if(!userAccountInfo) {
        bot.sendMessage(msg.chat.id, "Please login before purchase product!");
        return;
    }


    productModel.getProduct({id: pid}, async function (err, modelResult) {
        if (!err){
            var product = modelResult.content;
            if(product) {
                let productID = product.id;
                let productPrice = product.price;
                let seller = product.sellerAddress;
                let buyer = userAccountAddress;

                try {
                    bot.sendMessage(msg.chat.id, "Please wait for a while transaction is confirmed.");

                    let transactionResult = await purchaseProductInternal(userAccountInfo, seller, productID,  productPrice);

                    if(transactionResult) {
                        let amount =  product.amount - 1;
                        productModel.updateProduct({amount, productID}, function(err1, result) {
                            if(!err1) {
                                bot.sendMessage(msg.chat.id, `Your Order ID is ${transactionResult.orderID} \nPlease check in 'Check Order'\n------------------------------------\nPurchased! Please check this transaction, https://ropsten.etherscan.io/tx/${transactionResult.hash}`);
                            }
                        });
                    } else {
                        bot.sendMessage(msg.chat.id, `There was an error while purchasing. Please try again later! It might be reason that you don't have sufficient funds to make transaction. Please check your balance and deposit funds.`);
                    }
                } catch(error) {
                    bot.sendMessage(msg.chat.id, `There was an error while purchasing. Please try again later! It might be reason that you don't have sufficient funds to make transaction. Please check your balance and deposit funds.`);
                }
            } else {
                bot.sendMessage(msg.chat.id, "No products yet!");
            }
        } else {
            console.log(err)
            throw err;
        }
    });
}
// End purchase product

// Add Product Process
addProductText = (msg) => {
    let string = "You can add a product with its name, amount, price, description. Type /addProduct (name), (amount), (price), (description) to add product.";
    bot.sendMessage(msg.chat.id, string);
}

bot.onText(/\/addProduct (.+)/, (msg, match) => {
    const productInfo = match[1].split(',');
    const productName = productInfo[0]
    const productAmount = productInfo[1]
    const productPrice = productInfo[2]
    const productDesc = productInfo[3]

    if(isNumeric(productPrice) && isNumeric(productAmount))
        addProduct(productName, productAmount, productPrice, productDesc, msg);
    else if(!isNumeric(productPrice) && !isNumeric(productAmount))
        bot.sendMessage(msg.chat.id, 'Please input valid product amount and price. Only numeric value is accepted.');
    else if (!isNumeric(productPrice))
        bot.sendMessage(msg.chat.id, 'Please input valid product price. Only numeric value is accepted.');
    else
        bot.sendMessage(msg.chat.id, 'Please input valid product amount. Only numeric value is accepted.');
})

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

addProduct = (name, amount, price, description, msg) => {
    if(!userAccountInfo) {
        bot.sendMessage(msg.chat.id, "Please login before add product!");
        return;
    }

    var productData = {
        name,
        amount,
        price,
        description,
        sellerAddress: userAccountAddress
    }
    productModel.insertProduct(productData, function (err, subModelResult) {
        if (err){
            console.log(err)
            bot.sendMessage(msg.chat.id, "Error occured, please try again later!")
            throw new Error(err);
        }else{
            bot.sendMessage(msg.chat.id, "Added Successfully!")
        }
    });
}
// End Add Product

async function calcNonce(from) {
    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));

    let nonce = 0;

    nonce = await web3.eth.getTransactionCount(from, 'pending');
    return nonce;
}


async function purchaseProductInternal(userAccountInfo, sellerAddress, productID,  productPrice) {
    const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    const privateKey = new Buffer.from(userAccountInfo.privateKey.slice(2), 'hex');

    productPrice = productPrice.toFixed(2);
    const txCount = await calcNonce(userAccountInfo.address);
    const data = merchantSalesContract.methods.purchase(productID, sellerAddress, web3.utils.toWei(productPrice, 'ether')).encodeABI();

    const gasPrice = await getGasPrice();
    const amt = productPrice * Math.pow(10, 18);

    const rawTokenTransaction = {
        nonce: web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(settings.gasLimit),
        gasPrice: web3.utils.toHex(gasPrice),
        to: settings.merchantSalesContractAddress,
        from: userAccountInfo.address,
        data: data,
        value: amt
    };

    let tx = new Tx(rawTokenTransaction);

    tx.sign(privateKey);

    let serializedTx = tx.serialize();
    let raw = '0x' + serializedTx.toString('hex');

    return await new Promise((resolve, reject) => {
        web3.eth.sendSignedTransaction(raw).on('confirmation', (confirms, receipt) => {
            if (confirms === 1) {
                console.log({topic: receipt.logs[0].topics})
                resolve({hash: receipt.transactionHash, orderID: web3.utils.hexToNumber(receipt.logs[0].topics[3])});
            }
        }).on('error', (error) => {
            console.log({purchaseProductInternalError: error})
            resolve(false);
        });
    });
}


async function deliverProductInternal(orderID, userAccountInfo) {
    const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    const privateKey = new Buffer.from(userAccountInfo.privateKey.slice(2), 'hex');

    const txCount = await calcNonce(userAccountInfo.address);
    const data = merchantSalesContract.methods.deliverProduct(orderID).encodeABI();
    const gasPrice = await getGasPrice();

    const rawTokenTransaction = {
        nonce: web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(settings.gasLimit),
        gasPrice: web3.utils.toHex(gasPrice),
        to: settings.merchantSalesContractAddress,
        from: userAccountInfo.address,
        data: data,
        value: '0x00'
    };

    let tx = new Tx(rawTokenTransaction);

    tx.sign(privateKey);

    let serializedTx = tx.serialize();
    let raw = '0x' + serializedTx.toString('hex');

    return await new Promise((resolve, reject) => {
        web3.eth.sendSignedTransaction(raw).on('confirmation', (confirms, receipt) => {
            if (confirms === 1) {

                resolve({hash: receipt.transactionHash, orderID: parseFloat(receipt.logs[0].topics[2]) + 1});
            }
        }).on('error', (error) => {
            console.log({deliverProductInternalError: error})
            resolve(false);
        });
    });
}


async function confirmReceivedInternal(orderID, userAccountInfo) {
    const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    const privateKey = new Buffer.from(userAccountInfo.privateKey.slice(2), 'hex');

    const txCount = await calcNonce(userAccountInfo.address);
    const data = merchantSalesContract.methods.confirmReceived(orderID).encodeABI();
    const gasPrice = await getGasPrice();

    const rawTokenTransaction = {
        nonce: web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(settings.gasLimit),
        gasPrice: web3.utils.toHex(gasPrice),
        to: settings.merchantSalesContractAddress,
        from: userAccountInfo.address,
        data: data,
        value: '0x00'
    };

    let tx = new Tx(rawTokenTransaction);

    tx.sign(privateKey);

    let serializedTx = tx.serialize();
    let raw = '0x' + serializedTx.toString('hex');

    return await new Promise((resolve, reject) => {
        web3.eth.sendSignedTransaction(raw).on('confirmation', (confirms, receipt) => {
            if (confirms === 1) {
                resolve({hash: receipt.transactionHash, orderID: parseFloat(receipt.logs[0].topics[2]) + 1});
            }
        }).on('error', (error) => {
            console.log({confirmReceivedInternalError: error})
            resolve(false);
        });
    });
}


async function getGasPrice() {
    const web3 = new Web3(new Web3.providers.HttpProvider(`${settings.INFURA_ENDPOINT}/${settings.INFURA_KEY}`));

    let gasPrice = await web3.eth.getGasPrice();
    return gasPrice;
}

// Explorer transactions
explorTransactions = async (msg, accountType) => {
    bot.sendMessage(msg.chat.id, `To explore the real transaction in the blockchain. Join the group to check it out!\nhttps://t.me/joinchat/1ct2bL3ciz1hYjVl`);
    // await explorTransactionsInternal(msg, accountType);
}


async function explorTransactionsInternal(msg, accountType) {
    let query = {};

    if(!userAccountInfo) {
        bot.sendMessage(msg.chat.id, "Please login before explor transactions!");
    }

    if(accountType === 'buyer') {
        query = {buyer: userAccountInfo.address};
    } else if(accountType === 'seller') {
        query = {seller: userAccountInfo.address};
    }

    transactionModel.getTransaction(query, function(error, result) {
        if(error) {
            bot.sendMessage(msg.chat.id, "Error occured, please try again later!")
        } else {
            if(result.content.length>0) {
                let returnString = '';
                result.content.forEach(each => {
                    if(each.type === 'purchased') {
                        returnString = `${returnString} Transaction detail : https://ropsten.etherscan.io/tx/${each.hash}, order ID : ${each.orderID}, product ID : ${each.productID}, type : ${each.type.toUpperCase()} \n`;
                    } else {
                        returnString = `${returnString} Transaction detail : https://ropsten.etherscan.io/tx/${each.hash}, order ID : ${each.orderID}, type : ${each.type.toUpperCase()} \n`;
                    }
                });

                bot.sendMessage(msg.chat.id, returnString);
            } else {
                bot.sendMessage(msg.chat.id, "You didn't make any transaction yet!")
            }
        }
    })
}

// Check Orders

getOrderDetails = async (msg, accountType) => {
    let query = {};
    if(!userAccountInfo) {
        bot.sendMessage(msg.chat.id, "Please login before check Orders!");
    }

    if(accountType === 'buyer') {
        query = {buyer: userAccountInfo.address};
    } else if(accountType === 'seller') {
        query = {seller: userAccountInfo.address};
    }

    transactionModel.getTransaction(query, function(error, result) {
        if(error) {
            bot.sendMessage(msg.chat.id, "Error occured, please try again later!")
        } else {
            if(result.content.length>0) {
                let orderList = [];
                result.content.forEach(each => {
                    if(each.type === 'purchased') {
                        orderList.push({productID: each.productID, orderID: each.orderID, type: each.type});
                    } else {
                        orderList.push({orderID: each.orderID, type: each.type});
                    }
                });

                let returnString = 'If you want to deliver product, Type /deliver (orderID). \nIf you want to confirm delivered prodcut, Type /confirm (orderID) \n';

                let confirmedList = [], deliveredList = [], purchasedList = [];
                orderList.forEach(order => {
                    if (order.productID) {
                        if (orderList.find(function (o) {
                            return ((o.orderID == order.orderID) && (o.type == "confirmed"))
                        })) {
                            confirmedList.push(order)
                        } else if (orderList.find((o) => ((o.orderID == order.orderID) && (o.type == "delivered"))) && !orderList.find((o) => ((o.orderID == order.orderID && (o.type == "confirmed"))))) {
                            deliveredList.push(order)
                        } else {
                            purchasedList.push(order)
                        }
                    }
                });

                purchasedList.forEach((each) => {
                    returnString = `${returnString} ProductID: ${each.productID} OrderID: ${each.orderID} Status: Not yet delivered \n`;
                });

                deliveredList.forEach((each) => {
                    returnString = `${returnString} ProductID: ${each.productID} OrderID: ${each.orderID} Status: Delivered, but not confirmed by customer \n`;
                });

                confirmedList.forEach((each) => {
                    returnString = `${returnString} ProductID: ${each.productID} OrderID: ${each.orderID} Status: Completed \n`;
                });

                bot.sendMessage(msg.chat.id, returnString);
            } else {
                bot.sendMessage(msg.chat.id, "No orders related with you");
            }
        }
    })
}

async function deliverProduct(orderID, msg) {
    try {
        let transactionResult = await deliverProductInternal(orderID, userAccountInfo);

        if(transactionResult) {
            bot.sendMessage(msg.chat.id, `Your Order ID is ${parseFloat(orderID) + 1} \nPlease check in 'Check Order' \n----------------------------------\nDelivered! Please check this transaction, https://ropsten.etherscan.io/tx/${transactionResult.hash}`);
        } else {
            bot.sendMessage(msg.chat.id, `There was an error while delivering. Please try again later! It might be reason that you don't have sufficient funds to make transaction. Please check your balance and deposit funds.`);
        }
    } catch(error) {
        bot.sendMessage(msg.chat.id, `There was an error while delivering. Please try again later! It might be reason that you don't have sufficient funds to make transaction. Please check your balance and deposit funds.`);
    }

}

async function confirmReceived(orderID, msg) {
    try {
        let transactionResult = await confirmReceivedInternal(orderID, userAccountInfo);

        if(transactionResult) {
            bot.sendMessage(msg.chat.id, `Your Order ID is ${parseFloat(orderID) + 1} \nPlease check in 'Check Order' \n----------------------------------\nConfirmed! Please check this transaction, https://ropsten.etherscan.io/tx/${transactionResult.hash}`);
        } else {
            bot.sendMessage(msg.chat.id, `There was an error while confirming. Please try again later! It might be reason that you don't have sufficient funds to make transaction. Please check your balance and deposit funds.`);
        }
    } catch(error) {
        bot.sendMessage(msg.chat.id, `There was an error while confirming. Please try again later! It might be reason that you don't have sufficient funds to make transaction. Please check your balance and deposit funds.`);
    }

}
