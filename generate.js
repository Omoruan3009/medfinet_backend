const algosdk = require('algosdk');

const account = algosdk.generateAccount();
const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

console.log("Your new Algorand wallet address:");
console.log(account.addr);

console.log("\nYour 25-word mnemonic:");
console.log(mnemonic);
