const { issueVaccinationRecord, submitSignedTransaction } = require('../algorand/algorand');


const generateCertificate = require("./certificate/generateImage");
const uploadToIPFS = require("./certificate/uploadToIPFS");
const createVaccinationAssetImage = require("./certificate/certificate");


exports.issueRecord = async (req, res) => {
  try {
    const vaccinationData = req.body;
    
    // Validate data
    if (!vaccinationData.childIdHash || !vaccinationData.vaccineId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // const imagePath = await generateCertificate(vaccinationData);
    // const ipfsURL = await uploadToIPFS(imagePath, vaccinationData);
    const imageUrl = await createVaccinationAssetImage(vaccinationData);
    // Submit to Algorand
    const unsignedTxn = await issueVaccinationRecord(imageUrl, vaccinationData);
    
    res.json({
      success: true,
      unsignedTxn,
      imageUrl,
      message: 'Vaccination record issued on blockchain'
    });
  } catch (error) {
    console.error('Error issuing record:', error);
    res.status(500).json({ error: 'Failed to issue vaccination record' });
  }
};