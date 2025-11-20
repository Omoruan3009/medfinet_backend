// src/controllers/donation.controller.js
const SmartContractService = require('../../services/smartContractService');
const EscrowService = require('../../services/escrowService');
const { prisma } = require('../../utils/prisma');

const smartContractService = new SmartContractService();
const escrowService = new EscrowService();

const prepareDonation = async (req, res) => {
  try {
    const { campaignId, amount, donorWallet } = req.body;
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.appId) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found or not active'
      });
    }

    // Check if campaign is still active
    if (campaign.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not active'
      });
    }

    // Check if campaign has ended
    if (new Date() > campaign.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Campaign has ended'
      });
    }

    // Create donation record
    const donation = await prisma.donation.create({
      data: {
        amount: parseFloat(amount),
        currency: 'ALGO',
        donorWallet,
        campaignId,
        status: 'PENDING',
      },
    });

    // Prepare unsigned transaction for donor to sign
    // const { unsignedTxn, txId } = await smartContractService.donateToCampaign({
    //   appId: campaign.appId,
    //   donor: donorWallet,
    //   amount: parseFloat(amount),
    // });

    // // Convert transaction to base64 for frontend
    // const unsignedTxnBase64 = Buffer.from(unsignedTxn.toByte()).toString('base64');

    // res.status(200).json({
    //   success: true,
    //   data: {
    //     donationId: donation.id,
    //     unsignedTransaction: unsignedTxnBase64,
    //     transactionHash: txId,
    //     campaign: {
    //       title: campaign.title,
    //       escrowAddress: campaign.escrowAddress,
    //     },
    //   },
    //   message: 'Donation transaction prepared'
    // });
    // Prepare transactions for donor to sign
    const { transactions, txId } = await smartContractService.donateToCampaign({
      appId: campaign.appId,
      donor: donorWallet,
      amount: parseFloat(amount),
    });

    // Convert all transactions to base64 for frontend
    const unsignedTransactionsBase64 = transactions.map(txn => 
      Buffer.from(txn.toByte()).toString('base64')
    );

    res.status(200).json({
      success: true,
      data: {
        donationId: donation.id,
        unsignedTransactions: unsignedTransactionsBase64, // Now plural - array of transactions
        transactionHash: txId,
        campaign: {
          title: campaign.title,
          escrowAddress: campaign.escrowAddress,
        },
      },
      message: 'Donation transactions prepared'
    });
  } catch (error) {
    console.log('Donation preparation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prepare donation',
      error: error.message
    });
  }
};

const confirmDonation = async (req, res) => {
  try {
    const { donationId, signedTransaction } = req.body;

    // Convert base64 signed transaction back to Uint8Array
    // const signedTxn = new Uint8Array(Buffer.from(signedTransaction, 'base64'));
    // Process the donation
    const txId = await escrowService.processDonation(donationId, signedTransaction);

    res.status(200).json({
      success: true,
      data: {
        transactionHash: txId,
      },
      message: 'Donation confirmed successfully'
    });
  } catch (error) {
    console.error('Donation confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm donation',
      error: error.message
    });
  }
};

const getDonations = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const donations = await prisma.donation.findMany({
      where: { campaignId },
      include: {
        donor: {
          select: { name: true, wallet: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: donations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
};

module.exports = {
  prepareDonation,
  confirmDonation,
  getDonations
};