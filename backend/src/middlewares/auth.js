const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');
const RevokedToken = require('../models/revokedToken.model');

/**
 * Middleware to protect routes: Verifies JWT token and checks if it's revoked.
 */
const protect = async (req, res, next) => {
  let token;

  // Read Bearer token from authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. No token provided.'
    });
  }

  try {
    // Check if token has been blacklisted / revoked
    const isBlacklisted = await RevokedToken.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked or logged out.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ecommerce_customer_analytics_jwt_access_key_2026_top_secret');

    // Attach customer profile to request context
    const customer = await Customer.findById(decoded.id).select('+role');
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'No user account found matching this token.'
      });
    }

    req.user = customer;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid or expired token.'
    });
  }
};

/**
 * Middleware to restrict route access based on user role (RBAC).
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user ? req.user.role : 'none'}' does not have permission to access this resource.`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
