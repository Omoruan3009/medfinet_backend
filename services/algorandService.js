// src/services/algorand.service.js
const algosdk = require('algosdk');

class AlgorandService {
  constructor() {
    this.algodClient = new algosdk.Algodv2(
      process.env.ALGOD_TOKEN || '',
      process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
      process.env.ALGOD_PORT || 443
    );

    this.indexerClient = new algosdk.Indexer(
      '',
      process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
      443
    );

    // Platform wallet for fees (in production, use secure key management)
    this.platformWallet = algosdk.mnemonicToSecretKey(
      process.env.PLATFORM_WALLET_MNEMONIC || ''
    );
  }

  async getSuggestedParams() {
    return await this.algodClient.getTransactionParams().do();
  }

  async waitForConfirmation(txId) {
    console.log("Waiting for confirmation of txId:", txId);
    let lastRound = await this.algodClient.status().do();
    lastRound = lastRound['last-round'];

    try {
        // This function handles the polling loop, statusAfterBlock, etc.
        const confirmedTx = await algosdk.waitForConfirmation(this.algodClient, txId, 4);
        return confirmedTx;
    } catch (error) {
        console.error('Error waiting for confirmation (SDK function):', error);
        throw error; // Propagate the error up the chain
    }
  }

  async getAccountBalance(address) {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      return Number(accountInfo.amount);
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error}`);
    }
  }

  async verifyTransaction(txId) {
    try {
      const txInfo = await this.algodClient.pendingTransactionInformation(txId).do();
      return txInfo['confirmed-round'] !== undefined;
    } catch (error) {
      return false;
    }
  }

  async createUnsignedDonationTransaction(params) {
    const suggestedParams = await this.getSuggestedParams();
    
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: params.from,
      to: params.to,
      amount: Math.floor(params.amount * 1000000), // Convert to microAlgos
      note: params.note,
      suggestedParams,
    });
  }

  async sendSignedTransaction(signedTxn) {
    try {
      console.log("txn", signedTxn);
      if (Array.isArray(signedTxn)) {
        // Must be EXACTLY an array of Uint8Array
        const normalized = signedTxn.map(tx => new Uint8Array(tx));
        const txId = await this.algodClient.sendRawTransaction(normalized).do();
        return txId.txid;
      } else {
        // single txn
        const txId = await this.algodClient.sendRawTransaction(
          new Uint8Array(signedTxn)
        ).do();
        return txId.txid;
      }
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  getPlatformAddress() {
    console.log("Platform Address:", this.platformWallet.addr.toString());
    return this.platformWallet.addr.toString();
  }
}

module.exports = AlgorandService;