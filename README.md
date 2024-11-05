# Decentralized password manager Browser Extension
A Blockchain project of a decentralized password manager which can also be added as Chrome Extension.

## Important Note
Never share your passphrase or private keys with anyone and keep them in a safe place. Always test a new blockchain app using a testnet to make yourself sure and avoid any issues later on. 
<p>The purpose of this project is just to practice and get blockchain development experience.</p>
<p>➡️ <b>DO NOT USE THIS APP AS YOUR MAIN PASSWORD MANAGER</b> ⬅️</p>
<p>Because this is just a basic app and so far does not contain rich and robust security features.</p>

## Prerequisites
1) Node Js
2) NPM
3) Alchemy or Infura Developer Account

## Technologies Used
1) React Js - Frontend
2) Node Js - Backend
3) Ethers Js
4) Express Js

## Setup
1) Download or clone the repository using:
```sh
git clone https://github.com/urumat/master2024-dePass.git
```
2) Navigate to the backend folder and install dependencies:
```sh
cd backend
npm install
```
3) Do the same for mwallet folder (frontend) :
```sh
cd ..
cd mwallet
npm install
```

4) Go to mwallet directory now and make a .env file there as well and paste RPC URLs from your Alchemy or Infura. These RPC URLs are necessary to send transactions
```env
REACT_APP_ETHEREUM_RPC_URL=""
REACT_APP_MUMBAI_RPC_URL=""
REACT_APP_SEPOLIA_RPC_URL="" 
```
Currently we have only added these networks. You can add as many EVM compatible blockchains as you want.

5) Navigate to the backend directory and do the following in terminal:
```sh
node index.js
```
6) Now navigate to the mwallet (frontend) directory and dev start the application:
```sh
npm start
```
7) Now if everythings right, make a production build of the mwallet directory by running:
```sh
npm run build
```
The build folder wil be created in the mwallet directory

8) Go to Google Chrome (or any of your chromium browser) and open extensions from settings.

9) Turn on the developer mode and Load Unpack the build folder created after step 8 above.




