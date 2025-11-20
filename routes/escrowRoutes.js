// src/routes/escrow.routes.js
const { Router } = require('express');
const { initiatePayout, 
    getEscrowBalance, 
    initiateWithdrawal,
    completeWithdrawal,
    checkWithdrawalEligibility,
    getWithdrawalStatus } = require('../controllers/campaign/escrowController');
const { auth } = require('../middleware/auth');

const router = Router();

router.post('/payout', auth, initiatePayout);
router.get('/balance/:campaignId', getEscrowBalance);
router.post('/:campaignId/withdraw', auth, initiateWithdrawal);
router.post('/:withdrawalId/complete', auth, completeWithdrawal);
router.get('/:campaignId/can-withdraw', auth, checkWithdrawalEligibility);
router.get('/:withdrawalId', auth, getWithdrawalStatus);
module.exports = router;