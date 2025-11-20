const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // 1) Try to verify as Supabase JWT first
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      req.user = data.user;
      return next();
    }

    // 2) If Supabase fails, try to verify as our custom JWT (wallet-based)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

module.exports = { auth };