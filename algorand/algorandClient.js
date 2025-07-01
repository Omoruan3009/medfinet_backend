const algosdk = require("algosdk");

const algodToken = "a".repeat(64); // dummy token
const algodServer = "http://localhost";
const algodPort = 4001;

// const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
const algodClient = new algosdk.Algodv2(
  "", 
  "https://testnet-api.algonode.cloud", 
  443
);

module.exports = { algodClient, algosdk };
