1. Download node.js
2. Run (npm install)  in the terminal.
3. If some dependencies are not installed successfully, please run (npm install dependency_name). Replace the uninstalled dependency name.

If you need to deploy the contract, go to 4, otherwise go to 6.
4. Run truffle deploy --network=ropsten.
5. Replace the contract address return in the setting.js.

If you need to setup a new Ethereum node on Infura, go to 4, otherwise go to 10.
6. Go to https://infura.io
7. Sign up an account
8. Create a new project with Ropsten as the endpoints.
9. Replace the INFURA_ENDPOINT,INFURA_WEBSOCKET_ENDPOINT,INFURA_KEY in the setting.js respectively.

If you need to setup a new database environment, go to 10, otherwise go to 14.
10. Download MySQL Workbench.
11. Create a local instance.
12. Create a database 'msapp'.
13. Replace the username, password of database in the setting.js.

14. Run node index.js
15. Run event.js

16. Search @MSFYPbot in Telegram.
17. Start using the bot.
