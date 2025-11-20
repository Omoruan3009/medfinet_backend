// src/services/smartContract.service.js
const algosdk = require('algosdk');
const AlgorandService = require('./algorandService');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

class SmartContractService {
  constructor() {
    this.algorandService = new AlgorandService();
  }

   async createCampaignEscrow(campaignData) {
    try {
      console.log('Creating campaign escrow for:', campaignData);
      
      // Read TEAL files from local file system
      const approvalProgram = await this.compileTealProgram('campaign_escrow_approval.teal');
      const clearProgram = await this.compileTealProgram('campaign_escrow_clear.teal');

      const suggestedParams = await this.algorandService.getSuggestedParams();
      const platformWallet = await this.algorandService.getPlatformAddress();

      console.log('Platform wallet:', platformWallet);
      console.log('Creator wallet:', campaignData.creator);

      // Create application call transaction
      const txn = algosdk.makeApplicationCreateTxnFromObject({
      sender: platformWallet,            
      suggestedParams,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram,
      clearProgram,
      numGlobalByteSlices: 8,
      numGlobalInts: 8,
      numLocalByteSlices: 0,
      numLocalInts: 0,
      appArgs: [
        new TextEncoder().encode(campaignData.creator),
        algosdk.encodeUint64(campaignData.targetAmount),
        algosdk.encodeUint64(campaignData.endTime),
        new TextEncoder().encode(platformWallet),     
        
      ],
    });


      // Sign and send transaction
      const signedTxn = txn.signTxn(
        algosdk.mnemonicToSecretKey(process.env.PLATFORM_WALLET_MNEMONIC).sk
      );
      
      const txId = await this.algorandService.sendSignedTransaction(signedTxn);
      console.log('Transaction sent, waiting for confirmation:', txId);
      
      const result = await this.algorandService.waitForConfirmation(txId);
      console.log('Transaction confirmed:', result);

      const appId = Number(result['applicationIndex']);
      const escrowAddress = algosdk.getApplicationAddress(appId).toString();

      console.log('Escrow created - App ID:', appId, 'Address:', escrowAddress);

      return {
        escrowAddress,
        appId,
        txId,
      };
    } catch (error) {
      console.error('Smart contract creation error:', error);
      throw new Error(`Failed to create campaign escrow: ${error.message}`);
    }
  }

  async donateToCampaign(params) {
    try {
      const suggestedParams = await this.algorandService.getSuggestedParams();
      const appAddress = algosdk.getApplicationAddress(params.appId);
      // Create payment transaction to escrow
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.donor,
        receiver: appAddress.toString(),
        amount: Math.floor(params.amount*1000000),
        suggestedParams,
      });

      // Create application call to record donation
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.donor,
        suggestedParams,
        appIndex: params.appId,
        appArgs: [new TextEncoder().encode('donate')],
        foreignApps: [params.appId],
      });

      // Group transactions
      const group = [paymentTxn, appCallTxn];
      algosdk.assignGroupID(group);

      // return {
      //   unsignedTxn: group[0], // Return first transaction for signing
      //   txId: group[0].txID(),
      // };
    
      // Return both transactions
      return {
        transactions: [paymentTxn, appCallTxn], // Return array of transactions
        txId: paymentTxn.txID().toString() // Use payment tx as reference
      };
    } catch (error) {
      throw new Error(`Failed to create donation transaction: ${error}`);
    }
  }

  async withdrawFunds(params) {
    try {
      const suggestedParams = await this.algorandService.getSuggestedParams();

      const withdrawTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.creator,
        suggestedParams,
        appIndex: params.appId,
        appArgs: [new TextEncoder().encode('withdraw')],
        accounts: [this.algorandService.getPlatformAddress()], // Platform wallet for fees
      });

      const paymentTxn = algosdk.makePaymentTxn({
        sender: params.creator, // sender (same as above)
        suggestedParams,
        receiver: params.creator, // receiver (withdraw to creator)
        amount: 0, // amount (will be determined by smart contract)
        undefined, // closeRemainderTo
        undefined // note
    });

      // Group the transactions
      const group = [withdrawTxn, paymentTxn];
      const groupID = algosdk.computeGroupID(group);
      group.forEach(txn => txn.group = groupID);

      return {
        unsignedTxn: group, // Return array of transactions
        txId: withdrawTxn.txID()
      };
    } catch (error) {
      throw new Error(`Failed to create withdrawal transaction: ${error}`);
    }
  }

  async getCampaignState(appId) {
    try {
      const appInfo = await this.algorandService.algodClient
        .getApplicationByID(appId)
        .do();
      
      return appInfo.params['global-state'];
    } catch (error) {
      throw new Error(`Failed to get campaign state: ${error}`);
    }
  }

  async compileTealProgram(filename) {
    try {
      // Read TEAL file from local file system
      const contractsPath = path.join( process.cwd(), filename);
      console.log('Looking for TEAL file at:', contractsPath);
      
      if (!fs.existsSync(contractsPath)) {
        throw new Error(`TEAL file not found: ${contractsPath}`);
      }

      const tealCode = fs.readFileSync(contractsPath, 'utf8');
      console.log(`Compiling TEAL program: ${filename}`);

      // Compile TEAL code
      const compileResponse = await this.algorandService.algodClient.compile(tealCode).do();
      
      return new Uint8Array(Buffer.from(compileResponse.result, 'base64'));
    } catch (error) {
      console.error(`TEAL compilation error for ${filename}:`, error);
      throw new Error(`Failed to compile TEAL program: ${error.message}`);
    }
  }
}

module.exports = SmartContractService;