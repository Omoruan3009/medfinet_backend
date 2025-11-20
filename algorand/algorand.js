const algosdk = require('algosdk');
require('dotenv').config();
const crypto = require('crypto');

// Initialize Algod Client
const algodClient = new algosdk.Algodv2(
  "", 
  "https://testnet-api.algonode.cloud", 
  443
);

/**
 * Hashes metadata into 32-byte Uint8Array
 */
function hashMetadata(data) {
  const json = JSON.stringify(data);
  return new Uint8Array(
    crypto.createHash('sha256').update(json).digest()
  );
}

/**
 * Issues a vaccination record as an Algorand ASA (NFT)
 */
const issueVaccinationRecord = async (vaccinationDataURL, vaccinationData) => {
  try {
    // 1. Get network parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    const status = await algodClient.status().do();

    // 2. Create the NFT asset
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      sender: vaccinationData.healthWorkerWallet,
      assetName: `VAX-${vaccinationData.vaccineId}-${vaccinationData.batchNumber}`,
      unitName: `VAC-${vaccinationData.vaccineId.slice(0, 4)}`,
      assetURL: vaccinationDataURL, // URL to the metadata JSON
      assetMetadataHash: hashMetadata(vaccinationData),
      total: 1, // NFT
      decimals: 0,
      defaultFrozen: false,
      manager: vaccinationData.healthWorkerWallet,
      reserve: vaccinationData.healthWorkerWallet,
      freeze: vaccinationData.healthWorkerWallet,
      clawback: vaccinationData.healthWorkerWallet,
      note: new TextEncoder().encode(JSON.stringify(vaccinationData)),
      suggestedParams
    });

    // 3. Prepare for Pera Wallet
    const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
    const unsignedTxn = Buffer.from(encodedTxn).toString('base64');

    return unsignedTxn
  } catch (error) {
    console.error("Error creating vaccination record:", error);
    throw error;
  }
};

/**
 * Submits a signed transaction to the network
 */
const submitSignedTransaction = async (signedTxnBase64) => {
  try {
    const signedTxn = new Uint8Array(Buffer.from(signedTxnBase64, 'base64'));
    // const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    const signedTxnUint8ArrayArray = signedTxnBase64.map(base64Str =>
      Uint8Array.from(Buffer.from(base64Str, 'base64'))
    );

    // Submit signed transaction(s) to Algorand network
    // If single txn:
    const txId  = await algodClient.sendRawTransaction(signedTxnUint8ArrayArray[0]).do();

    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId.txid, 4);
    const assetID = confirmedTxn['assetIndex'];

    const txnId = txId.txid;
    
    return {txnId, assetID};

  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
};

module.exports = {
  issueVaccinationRecord,
  submitSignedTransaction
};