var MerchantSalesApplication = artifacts.require("MerchantSalesApplication");

module.exports = function(deployer) {
  // deployment steps
  deployer.deploy(MerchantSalesApplication);
};