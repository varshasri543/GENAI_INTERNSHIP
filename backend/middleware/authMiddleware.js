const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'apollo_jwt_secret_key_2026');
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ detail: 'Not authorized, user not found.' });
      }
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.warn(`JWT verification notice: Token expired at ${error.expiredAt}`);
        return res.status(401).json({ detail: 'Token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      console.error('JWT verification error:', error.message || error);
      return res.status(401).json({ detail: 'Not authorized, token failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ detail: 'Not authorized, no token.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ detail: 'Forbidden: Admin access required.' });
  }
};

module.exports = { protect, adminOnly };
