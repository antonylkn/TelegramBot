/////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////// Functions  ///////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var bot = require('../config/bot');
var settings = require('../config/settings');
var productModel = require('../models/product');

let userAccountInfo, userAccountAddress;

//connect to the blockchain
exports.createAddress = (msg) => {
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));
    userAccountInfo = web3.eth.accounts.create();
    userAccountAddress = userAccountInfo.address
    bot.sendMessage(
        msg.chat.id, "Public address: " + userAccountAddress +"\nPrivate Key: " + userAccountInfo.privateKey)
    callMainMenu(msg)
}

exports.login = (msg) => {
    bot.sendMessage(msg.chat.id, "Please enter your private key to log in your wallet.\n Type /privateKey (your_private_key) to log in.")
    bot.onText(/\/privateKey (.+)/, (msg, match) => {
        try{
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
}

exports.getBalance = async (msg) => {
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));
    let balance = await web3.eth.getBalance(userAccountAddress);
    balance = web3.utils.fromWei(balance, 'ether');
    bot.sendMessage(
        msg.chat.id, "Your balance is " + balance + " ETH");
}

// End Search Product

// Purchase product
exports.purchaseProduct = async (msg, pid) => {
    productModel.getProduct({id: pid}, function (err, modelResult) {
        if (!err){
            var product = modelResult.content;
            if(product) {
                let productID = results[0].id;
                let productPrice = results[0].price;
                let seller = results[0].sellerAddress;
                let buyer = userAccountAddress;

                let transactionResult = await exports.purchaseProductInternal(userAccountInfo, seller, productID,  productPrice);

                if(transactionResult) {

                }
            } else {
                bot.sendMessage(msg.chat.id, "No products yet!")
            }
        } else {
            console.log(err)
            throw err;
        }
    });
}
// End purchase product

// Add Product Process
exports.addProductText = (msg) => {
    let string = "You can add a product with its name, amount, price, description. Type /addProduct (name), (amount), (price), (description) to add product.";
    bot.sendMessage(msg.chat.id, string).then((string) => {
        bot.onText(/\/addProduct (.+)/, (msg, match) => {
            const productInfo = match[1].split(',');
            const productName = productInfo[0]
            const productAmount = productInfo[1]
            const productPrice = productInfo[2]
            const productDesc = productInfo[3]
            let results = addProduct(productName, productAmount, productPrice, productDesc, msg)
        })
    })
}

exports.addProduct = (name, amount, price, desc, msg) => {
    let sql = "INSERT INTO `product`(`name`, `amount`, `price`, `description`, `sellerAddress`) VALUES ('" + name + "'," + amount + ","+ price +",'"+ desc +"','" + userAccountAddress + "')";

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err)
            bot.sendMessage(msg.chat.id, "Error occured, please try again later!")
            throw err;
        } else {
            bot.sendMessage(msg.chat.id, "Added Successfully!")
        }
    })
}
// End Add Product

async function calcNonce(from) {
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));

    let nonce = 0;

    nonce = await web3.eth.getTransactionCount(from, 'pending');
    return nonce;
}

exports.calcNonce = calcNonce;

async function purchaseProductInternal(userAccountInfo, sellerAddress, productID,  productPrice) {
    const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    const privateKey = new Buffer.from(userAccountInfo.privateKey.slice(2), 'hex');

    const txCount = await exports.calcNonce(userAccountInfo.address);
    const data = merchantSalesContract.methods.purchase(productID, sellerAddress, productPrice).encodeABI();
    const gasPrice = await exports.getGasPrice();
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
            if (confirms === 2) {
                resolve(true);
            }
        }).on('error', (error) => {
            console.log(error);
            reject(false);
        });
    });
}

exports.purchaseProductInternal = purchaseProductInternal;

async function deliverProduct(orderID, userAccountInfo) {
    const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    const privateKey = new Buffer.from(userAccountInfo.privateKey.slice(2), 'hex');

    const txCount = await exports.calcNonce(userAccountInfo.address);
    const data = merchantSalesContract.methods.deliverProduct(orderID).encodeABI();
    const gasPrice = await exports.getGasPrice();

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
            if (confirms === 2) {
                resolve(true);
            }
        }).on('error', (error) => {
            console.log(error);
            reject(false);
        });
    });
}

exports.deliverProduct = deliverProduct;

async function confirmReceived(userAccountInfo, orderID) {
    const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    const privateKey = new Buffer.from(userAccountInfo.privateKey.slice(2), 'hex');

    const txCount = await exports.calcNonce(userAccountInfo.address);
    const data = merchantSalesContract.methods.confirmReceived(orderID).encodeABI();
    const gasPrice = await exports.getGasPrice();

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
            if (confirms === 2) {
                resolve(true);
            }
        }).on('error', (error) => {
            console.log(error);
            reject(false);
        });
    });
}

exports.confirmReceived = confirmReceived;

async function getGasPrice() {
    const web3 = new Web3(new Web3.providers.HttpProvider(settings.INFURA_KEY));

    let gasPrice = await web3.eth.getGasPrice();
    return gasPrice;
}

exports.getGasPrice = getGasPrice;
