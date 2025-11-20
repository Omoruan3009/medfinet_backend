const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin checks
);

// POST /api/admin/auth/wallet-login
router.post('/auth/wallet-login', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'wallet_address is required'
      });
    }

    // Query Supabase to verify hospital exists with this wallet
    const { data: hospital, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('verified', true)
      .eq('status', 'approved')
      .single();

    if (error || !hospital) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or unverified wallet address'
      });
    }

    // Create a temporary JWT token (valid for 24 hours)
    const token = jwt.sign(
      {
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        wallet_address: hospital.wallet_address,
        admin_email: hospital.admin_email,
        is_hospital_admin: true
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      hospital
    });
  } catch (err) {
    console.error('wallet-login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

module.exports = router;