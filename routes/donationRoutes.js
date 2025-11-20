// src/routes/donation.routes.js
const { Router } = require('express');
const { prepareDonation, confirmDonation, getDonations } = require('../controllers/campaign/donationController');
const { auth } = require('../middleware/auth');

const router = Router();

router.post('/prepare', prepareDonation);
router.post('/confirm', confirmDonation);
router.get('/campaign/:campaignId', getDonations);

module.exports = router;