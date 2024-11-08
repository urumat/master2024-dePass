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
REACT_APP_BASESEPOLIA_RPC_URL=""
```

Go to backend directory now and make a .env file there as well and paste RPC URLs from your Alchemy or Infura. These RPC URLs are necessary to send transactions
```env
BASE_SEPOLIA_RPC_URL=""
BASE_SEPOLIA_CONTRACT_ADDRESS=0xb87cDe7cC8abF412dC4c38255593bCEbE96cb241
MONGO_URI=mongodb://localhost:27017/logsDB
```

Currently we have only added these networks. You can add as many EVM compatible blockchains as you want.

5) Navigate to the backend directory and do the following in terminal:
```sh


```
1) Install Mongo DB
```sh

sudo apt update
sudo apt upgrade

wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo mongod --dbpath /var/lib/mongodb --bind_ip 0.0.0.0

```
2) If using Ubuntu 22.04
```sh

wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc |  gpg --dearmor | sudo tee /usr/share/keyrings/mongodb.gpg > /dev/null
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install mongodb-org


```
3) Run Backend
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




