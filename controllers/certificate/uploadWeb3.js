const { Web3Storage, File } = require('web3.storage');

/**
 * Creates a Web3Storage client.
 */
function makeStorageClient() {
  return new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
}

/**
 * Prepares JSON metadata and uploads to Web3.Storage.
 */
async function uploadVaccinationRecord(vaccineData) {
  const metadata = JSON.stringify(vaccineData, null, 2);

  const files = [
    new File([metadata], 'vaccination.json', { type: 'application/json' })
  ];

  const client = makeStorageClient();
  const cid = await client.put(files);

  console.log('✅ Successfully uploaded to IPFS via Web3.Storage');
  console.log(`🧾 CID: ${cid}`);
  console.log(`🔗 Gateway URL: https://${cid}.ipfs.dweb.link/vaccination.json`);
  
  return cid;
}

module.exports = uploadVaccinationRecord;