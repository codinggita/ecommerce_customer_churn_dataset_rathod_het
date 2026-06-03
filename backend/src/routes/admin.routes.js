const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const Customer = require('../models/customer.model');
const analyticsController = require('../controllers/analytics.controller');

// Enforce both JWT authentication and admin role authorization
router.use(protect);
router.use(authorize('admin'));

// OPTIONS /admin/customers - Check supported methods (Admin only)
router.options('/customers', (req, res) => {
  res.setHeader('Allow', 'GET, OPTIONS');
  res.sendStatus(200);
});

// GET /admin/customers - Manage customer listings (Admin only)
router.get('/customers', async (req, res, next) => {
  try {
    const totalCount = await Customer.countDocuments({});
    res.status(200).json({
      success: true,
      message: 'Admin access granted to customer management.',
      data: {
        totalCustomers: totalCount,
        actionsAllowed: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'BULK_IMPORT']
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/stats - Admin Dashboard Statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ['$totalPurchases', '$averageOrderValue'] } },
          avgLTV: { $avg: '$lifetimeValue' },
          totalPurchases: { $sum: '$totalPurchases' }
        }
      }
    ]);
    res.status(200).json({
      success: true,
      message: 'Admin access granted to dashboard statistics.',
      data: stats[0] || {}
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/churn-analysis - Admin Churn Management
router.get('/churn-analysis', analyticsController.getChurnAnalysis);

module.exports = router;
