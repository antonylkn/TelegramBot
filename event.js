const Web3 = require('web3');
const cron = require('node-cron');
const axios = require("axios");

const baseDir = process.cwd();
var settings = require('./config/settings');


const web3 = new Web3(new Web3.providers.WebsocketProvider(`${settings.INFURA_WEBSOCKET_ENDPOINT}/${settings.INFURA_KEY}`));
const contractABI = require(baseDir + '/build/contracts/MerchantSalesApplication.json').abi;
var transactionModel = require('./models/transaction');

async function getEvents() {
    const merchantSalesContract = await new web3.eth.Contract(contractABI, settings.merchantSalesContractAddress);

    merchantSalesContract.events.allEvents({
        fromBlock: 0
    }, function(error, result) {
        if(error) {
            console.log({error});
        } else {
            let {event, transactionHash, returnValues} = {...result};
            let trxDetail = {};
            if(event === 'PurchaseConfirmed') {
                let {buyer, seller, productID,orderID} = {...returnValues};

                trxDetail = {
                    buyer,
                    seller,
                    hash: transactionHash,
                    orderID,
                    productID,
                    type: 'purchased'
                };
            } else if(event === 'ProductReceived' || event === 'ProductDelivered') {
                let {buyer, seller, orderID, productID} = {...returnValues};


                trxDetail = {
                    buyer,
                    seller,
                    hash: transactionHash,
                    orderID: parseFloat(orderID) + 1,
                    productID,
                    type: (event === 'ProductReceived')?'confirmed':((event === 'ProductDelivered')?'delivered':'')
                };

            }

            setTimeout(async () => {
                try {
                    transactionModel.getTransaction({hash: transactionHash}, function(error1, returnedResult) {
                        if(error1) {
                            //console.log(error1)
                        } else if(returnedResult.content.length === 0){
                            transactionModel.insertTransaction(trxDetail, async function(error2, result) {
                                if (error2){
                                    //console.log(error2)
                                    throw new Error(error2);
                                } else {
                                    const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
                                    const notification = `Buyer address: ${trxDetail.buyer}, \nSeller address: ${trxDetail.seller}, \nOrder ID: ${trxDetail.orderID} \nProduct ID: ${trxDetail.productID} \nStatus : ${trxDetail.type}, \nTransaction detail : https://ropsten.etherscan.io/tx/${transactionHash}`;

                                    setTimeout(async () => {
                                        await axios.post(url, {
                                            chat_id: settings.groupID,
                                            text: notification,
                                            parse_mode: 'html',
                                            disable_web_page_preview: true
                                        });
                                    }, 1000);
                                }
                            })
                        }
                    })
                } catch(error) {
                    throw new Error(error);
                }

            }, 1000);
        }
    })
}



cron.schedule('* * * * *', () => {
    getEvents();
});
