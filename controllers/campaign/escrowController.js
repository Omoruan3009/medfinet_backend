// src/controllers/escrow.controller.js
const  EscrowService  = require('../../services/escrowService');
const { prisma } = require('../../utils/prisma');

const escrowService = new EscrowService();

const initiatePayout = async (req, res) => {
  try {
    const { campaignId } = req.body;

    const txId = await escrowService.processPayout(campaignId);

    res.status(200).json({
      success: true,
      data: {
        transactionHash: txId,
      },
      message: 'Payout initiated successfully'
    });
  } catch (error) {
    console.error('Payout initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payout',
      error: error.message
    });
  }
};

const getEscrowBalance = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.escrowAddress) {
      return res.status(404).json({
        success: false,
        message: 'Campaign or escrow address not found'
      });
    }

    const balance = await escrowService.getEscrowBalance(campaign.escrowAddress);

    res.status(200).json({
      success: true,
      data: {
        balance,
        escrowAddress: campaign.escrowAddress,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get escrow balance',
      error: error.message
    });
  }
};

// Initiate withdrawal
const initiateWithdrawal = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { recipientWallet } = req.body;

    if (!recipientWallet) {
      return res.status(400).json({ error: 'Recipient wallet is required' });
    }

    const result = await escrowService.processWithdrawal(campaignId, recipientWallet);

    res.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      data: result
    });

  } catch (error) {
    console.error('Withdrawal initiation error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to initiate withdrawal' 
    });
  }
};

// Complete withdrawal with signed transaction
const completeWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { signedTransaction } = req.body;

    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction is required' });
    }

    const result = await escrowService.completeWithdrawal(withdrawalId, signedTransaction);

    res.json({
      success: true,
      message: 'Withdrawal completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Withdrawal completion error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to complete withdrawal' 
    });
  }
};

// Check withdrawal eligibility
const checkWithdrawalEligibility = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = await escrowService.canWithdrawCampaign(campaignId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Withdrawal check error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to check withdrawal eligibility' 
    });
  }
};

// Get withdrawal status
const getWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    
    const withdrawal = await escrowService.getWithdrawalStatus(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    res.json({
      success: true,
      data: withdrawal
    });

  } catch (error) {
    console.error('Withdrawal status error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to get withdrawal status' 
    });
  }
};

module.exports = {
  initiatePayout,
  getEscrowBalance,
  initiateWithdrawal,
  completeWithdrawal,
  checkWithdrawalEligibility,
  getWithdrawalStatus
};