const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const customerController = require('../controllers/customer.controller');
const { protect, authorize } = require('../middlewares/auth');

// Token Operations
router.post('/generate-token', authController.jwtGenerateToken);
router.post('/verify-token', authController.jwtVerifyToken);
router.post('/refresh-token', authController.jwtRefreshToken);
router.delete('/revoke-token', authController.jwtRevokeToken);

// OPTIONS /jwt/profile - Check communication options
router.options('/profile', (req, res) => {
  res.setHeader('Allow', 'GET, OPTIONS');
  res.sendStatus(200);
});

// Protected Profiles & Dashboards
router.get('/profile', protect, authController.getProfile);

router.get('/dashboard', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the JWT Protected Dashboard.',
    data: {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role,
      accessedAt: new Date().toISOString()
    }
  });
});

// Protected Customer Records
router.get('/private-customers', protect, customerController.getCustomers);

// Protected Stats
router.get('/private-stats', protect, async (req, res, next) => {
  try {
    // Return sample counts as protected stats payload
    res.status(200).json({
      success: true,
      message: 'Access granted to private stats.',
      data: {
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin-Only Route
router.get('/admin', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin! You have accessed the admin-only route.',
    data: {
      adminId: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Customer Insights
router.get('/customer-insights', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Customer Insights Dashboard.',
    data: {
      insights: [
        { topic: 'Churn Risk', riskLevel: 'Medium-High', recommendation: 'Target discount emails' },
        { topic: 'App Usage', usageTrend: 'Growing', recommendation: 'Push notification updates' }
      ]
    }
  });
});

module.exports = router;
