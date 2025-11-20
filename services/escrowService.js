// src/services/escrow.service.js
const SmartContractService = require('./smartContractService');
const AlgorandService = require('./algorandService');
const { prisma } = require('../utils/prisma');

class EscrowService {
  constructor() {
    this.smartContractService = new SmartContractService();
    this.algorandService = new AlgorandService();
  }

  async initializeCampaignEscrow(campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { creator: true }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Convert end date to Unix timestamp
    const endTime = Math.floor(campaign.endDate.getTime() / 1000);

    const result = await this.smartContractService.createCampaignEscrow({
      creator: campaign.creatorWallet,
      targetAmount: campaign.targetAmount,
      endTime,
    });

    // Update campaign with escrow details
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        escrowAddress: result.escrowAddress,
        appId: result.appId,
        status: 'ACTIVE',
      },
    });

    return {
      escrowAddress: result.escrowAddress,
      appId: result.appId,
    };
  }

  async processDonation(donationId, signedTransaction) {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { campaign: true }
    });

    if (!donation) {
      throw new Error('Donation not found');
    }

    try {
      // Send signed transaction to blockchain
      let signedTxnsUint8;
    
      if (Array.isArray(signedTransaction)) {
        // If it's an array, convert each transaction
        signedTxnsUint8 = signedTransaction.map(txn => 
          new Uint8Array(Buffer.from(txn, 'base64'))
        );
      } else {
        // If it's a single transaction (backward compatibility)
        signedTxnsUint8 = new Uint8Array(Buffer.from(signedTransaction, 'base64'));
      }
      const txId = await this.algorandService.sendSignedTransaction(signedTxnsUint8);
      // Wait for confirmation
      await this.algorandService.waitForConfirmation(txId);

      // Update donation status
      await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          transactionHash: txId,
        },
      });

      // Update campaign raised amount
      await prisma.campaign.update({
        where: { id: donation.campaignId },
        data: {
          raisedAmount: {
            increment: donation.amount,
          },
        },
      });

      return txId;
    } catch (error) {
      // Mark donation as failed
      await prisma.donation.update({
        where: { id: donationId },
        data: { status: 'FAILED' },
      });
      
      throw new Error(`Donation processing failed: ${error}`);
    }
  }

  async processPayout(campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { creator: true }
    });

    if (!campaign || !campaign.appId) {
      throw new Error('Campaign or app ID not found');
    }

    // Check if campaign has ended
    if (new Date() < campaign.endDate) {
      throw new Error('Campaign has not ended yet');
    }

    // Create withdrawal transaction
    const { unsignedTxn, txId } = await this.smartContractService.withdrawFunds({
      appId: campaign.appId,
      creator: campaign.creatorWallet,
    });

    // Store payout record
    const payout = await prisma.escrowPayout.create({
      data: {
        campaignId,
        amount: campaign.raisedAmount,
        transactionHash: txId,
        status: 'PENDING',
      },
    });

    return txId;
  }

  async getEscrowBalance(escrowAddress) {
    return await this.algorandService.getAccountBalance(escrowAddress);
  }

  async verifyCampaignCompletion(campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.appId) {
      return false;
    }

    const state = await this.smartContractService.getCampaignState(campaign.appId);
    
    // Check if campaign is still active in smart contract
    const isActive = state.find((s) => s.key === 'campaign_active')?.value;
    return !isActive;
  }
  async processWithdrawal(campaignId, recipientWallet) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { creator: true }
    });

    if (!campaign || !campaign.appId) {
      throw new Error('Campaign or app ID not found');
    }

    // Check campaign status and conditions
    if (campaign.status === 'WITHDRAWN') {
      throw new Error('Funds already withdrawn');
    }

    // Check if campaign can be withdrawn
    // const canWithdraw = await this.canWithdrawCampaign(campaignId);
    // if (!canWithdraw.canWithdraw) {
    //   throw new Error(canWithdraw.reason || 'Campaign cannot be withdrawn yet');
    // }
    // Verify ownership
    if (campaign.creatorWallet !== recipientWallet) {
      throw new Error('Not authorized to withdraw from this campaign');
    }

    try {
      // Process payout through smart contract
      const { unsignedTxn, txId } = await this.smartContractService.withdrawFunds({
        appId: campaign.appId,
        creator: campaign.creatorWallet,
      });

      // Convert unsigned transaction for frontend signing
      let withdrawalTx;
    
      // Handle different transaction formats
      if (unsignedTxn instanceof Uint8Array) {
        // If it's already Uint8Array (most common)
        withdrawalTx = Buffer.from(unsignedTxn).toString('base64');
      } else if (typeof unsignedTxn === 'string') {
        // If it's already a base64 string
        withdrawalTx = unsignedTxn;
      } else if (unsignedTxn && typeof unsignedTxn.toByte === 'function') {
        // If it's a Transaction object with toByte() method
        const txnBytes = unsignedTxn.toByte();
        withdrawalTx = Buffer.from(txnBytes).toString('base64');
      } else if (unsignedTxn && unsignedTxn.blob) {
        // If it has a blob property
        withdrawalTx = Buffer.from(unsignedTxn.blob).toString('base64');
      } else {
        // Try to convert to JSON string as last resort
        console.warn('Unknown transaction format, attempting JSON conversion');
        withdrawalTx = Buffer.from(JSON.stringify(unsignedTxn)).toString('base64');
      }

      // Store withdrawal record
      const withdrawal = await prisma.campaignWithdrawal.create({
        data: {
          campaignId,
          amount: campaign.raisedAmount,
          recipientWallet: campaign.creatorWallet,
          transactionHash: txId,
          status: 'PENDING_SIGNATURE',
          unsignedTransaction: withdrawalTx,
        },
      });

      return {
        withdrawalId: withdrawal.id,
        unsignedTransaction: withdrawalTx,
        transactionHash: txId,
        amount: campaign.raisedAmount,
        currency: campaign.currency
      };

    } catch (error) {
      console.error('Withdrawal processing error:', error);
      throw new Error(`Withdrawal failed: ${error.message}`);
    }
  }

  async completeWithdrawal(withdrawalId, signedTransaction) {
    const withdrawal = await prisma.campaignWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { campaign: true }
    });

    if (!withdrawal) {
      throw new Error('Withdrawal record not found');
    }

    try {
      // Send signed transaction to blockchain
      let signedTxnsUint8;
      
      if (Array.isArray(signedTransaction)) {
        signedTxnsUint8 = signedTransaction.map(txn => 
          new Uint8Array(Buffer.from(txn, 'base64'))
        );
      } else {
        signedTxnsUint8 = new Uint8Array(Buffer.from(signedTransaction, 'base64'));
      }

      const txId = await this.algorandService.sendSignedTransaction(signedTxnsUint8);
      await this.algorandService.waitForConfirmation(txId);

      // Update withdrawal status
      await prisma.campaignWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          transactionHash: txId,
        },
      });

      // Update campaign status
      await prisma.campaign.update({
        where: { id: withdrawal.campaignId },
        data: {
          status: 'WITHDRAWN',
          withdrawnAmount: withdrawal.amount,
          withdrawnAt: new Date(),
        },
      });

      return {
        success: true,
        transactionHash: txId,
        amount: withdrawal.amount,
        completedAt: new Date()
      };

    } catch (error) {
      // Mark withdrawal as failed
      await prisma.campaignWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'FAILED' },
      });
      
      throw new Error(`Withdrawal completion failed: ${error.message}`);
    }
  }

  async canWithdrawCampaign(campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return { canWithdraw: false, reason: 'Campaign not found' };
    }

    // Check if already withdrawn
    if (campaign.status === 'WITHDRAWN') {
      return { canWithdraw: false, reason: 'Funds already withdrawn' };
    }

    // Check end date
    const now = new Date();
    const endDate = new Date(campaign.endDate);
    const hasEnded = endDate <= now;

    // Check funding goal
    const goalReached = campaign.raisedAmount >= campaign.targetAmount;

    // Check if campaign has funds
    const hasFunds = campaign.raisedAmount > 0;

    if (!hasEnded && !goalReached) {
      return { 
        canWithdraw: false, 
        reason: 'Campaign must be completed or ended to withdraw funds' 
      };
    }

    if (!hasFunds) {
      return { 
        canWithdraw: false, 
        reason: 'No funds available for withdrawal' 
      };
    }

    // Check smart contract state if available
    if (campaign.appId) {
      try {
        const state = await this.smartContractService.getCampaignState(campaign.appId);
        const isActive = state.find((s) => s.key === 'campaign_active')?.value;
        if (isActive) {
          return { 
            canWithdraw: false, 
            reason: 'Campaign still active in smart contract' 
          };
        }
      } catch (error) {
        console.warn('Could not check smart contract state:', error);
        // Continue with basic checks if smart contract check fails
      }
    }

    return { canWithdraw: true };
  }

  async getWithdrawalStatus(withdrawalId) {
    return await prisma.campaignWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { campaign: true }
    });
  }

}

module.exports = EscrowService;