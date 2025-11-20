// src/routes/campaign.routes.js
const { Router } = require('express');
const { createCampaign, getCampaigns, getCampaign } = require('../controllers/campaign/campaignController');
const { auth } = require('../middleware/auth');

const router = Router();

router.post('/', auth, createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);

module.exports = router;