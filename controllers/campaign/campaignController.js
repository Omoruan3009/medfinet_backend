// src/controllers/campaign.controller.js
const EscrowService = require('../../services/escrowService');
const { prisma } = require('../../utils/prisma');

const escrowService = new EscrowService();

// src/controllers/campaign.controller.js - FIXED
const createCampaign = async (req, res) => {
  try {
    const { title, description, targetAmount, category, endDate, impactGoal, imageUrl } = req.body;
    
    // req.user comes from Supabase auth middleware
    const supabaseUser = req.user; 
    console.log("supa", supabaseUser)
    const id = supabaseUser.hospital_id.toString();
    // Check if user exists in Prisma, if not create them
    let user = await prisma.user.findUnique({
      where: { id: id }
    });

    // If user doesn't exist in Prisma, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: id,
          email: supabaseUser.admin_email,
          name: supabaseUser.hospital_name || supabaseUser.email,
          wallet: supabaseUser.wallet_address, // From Supabase profile
          // Add other fields from Supabase as needed
        }
      });
    }

    // Check if user has wallet connected
    if (!user.wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet not connected to your account. Please connect your Algorand wallet first.'
      });
    }

    // Create campaign with user's wallet
    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        targetAmount: parseFloat(targetAmount),
        category,
        endDate: new Date(endDate),
        impactGoal,
        imageUrl: imageUrl[0],
        creatorId: user.id, // Use Prisma user ID
        creatorWallet: user.wallet,
        status: 'PENDING',
      },
    });

    // Initialize escrow smart contract
    const escrowResult = await escrowService.initializeCampaignEscrow(campaign.id);

    res.status(201).json({
      success: true,
      data: {
        ...campaign,
        ...escrowResult,
      },
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
};

const getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        creator: {
          select: { name: true, wallet: true }
        },
        _count: {
          select: { donations: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message
    });
  }
};

const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        creator: {
          select: { name: true, email: true, wallet: true }
        },
        donations: {
          include: {
            donor: {
              select: { name: true, wallet: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        updates: {
          orderBy: { createdAt: 'desc' }
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get current escrow balance
    let escrowBalance = 0;
    if (campaign.escrowAddress) {
      escrowBalance = await escrowService.getEscrowBalance(campaign.escrowAddress);
    }

    res.status(200).json({
      success: true,
      data: {
        ...campaign,
        escrowBalance,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
      error: error.message
    });
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaign
};