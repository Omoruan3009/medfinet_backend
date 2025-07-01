const express = require('express');
const router = express.Router();
const vaccinationController = require('../controllers/vaccination');
const { submitSignedTransaction } = require('../algorand/algorand');

router.post('/api/vaccinations', vaccinationController.issueRecord);

// Backend code
router.post('/api/submit', async (req, res) => {
  const { signedTxn } = req.body;
  const {txnId, assetID} = await submitSignedTransaction(signedTxn);
  res.json({
      success: true,
      txnId,
      assetID: assetID.toString() ,
      message: 'Transaction submitted successfully'
    });
});

module.exports = router;