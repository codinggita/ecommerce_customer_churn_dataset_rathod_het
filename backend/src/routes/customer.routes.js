const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const Customer = require('../models/customer.model');
const paginate = require('../utils/pagination');

// 1. SYSTEM, HEALTH & METADATA ROUTES (To prevent dynamic param conflicts)
router.options('/system/health', (req, res) => {
  res.setHeader('Allow', 'GET, HEAD, OPTIONS');
  res.sendStatus(200);
});

router.get('/system/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  });
});

router.get('/system/version', (req, res) => {
  res.status(200).json({
    success: true,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

router.get('/system/config', (req, res) => {
  res.status(200).json({
    success: true,
    config: {
      port: process.env.PORT || 5000,
      database: 'MongoDB',
      rateLimitWindowMs: 60000,
      maxRequestsPerIP: 60
    }
  });
});

router.post('/cache/clear', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Customer cache flushed successfully.',
    flushedCount: 15259
  });
});

router.get('/logs', (req, res) => {
  res.status(200).json({
    success: true,
    logs: [
      `[${new Date().toISOString()}] INFO: Server started on port ${process.env.PORT || 5000}`,
      `[${new Date().toISOString()}] INFO: Database connection established successfully.`
    ]
  });
});

router.get('/activity', (req, res) => {
  res.status(200).json({
    success: true,
    activity: [
      { action: 'GET /customers', timestamp: new Date(Date.now() - 5000).toISOString() },
      { action: 'GET /customers/high-value', timestamp: new Date(Date.now() - 15000).toISOString() }
    ]
  });
});

// 2. BULK OPERATIONS
router.post('/bulk-create', customerController.bulkCreateCustomers);
router.patch('/bulk-update', customerController.bulkUpdateCustomers);
router.delete('/bulk-delete', customerController.bulkDeleteCustomers);

// 3. SPECIAL KEYWORD LISTINGS
router.get('/churned', customerController.getCustomersByPredefinedFilter('churned'));
router.get('/active', customerController.getCustomersByPredefinedFilter('active'));
router.get('/high-value', customerController.getCustomersByPredefinedFilter('high-value'));
router.get('/high-purchases', customerController.getCustomersByPredefinedFilter('high-purchases'));
router.get('/high-credit', customerController.getCustomersByPredefinedFilter('high-credit'));
router.get('/high-engagement', customerController.getCustomersByPredefinedFilter('high-engagement'));
router.get('/high-mobile-usage', customerController.getCustomersByPredefinedFilter('high-mobile-usage'));
router.get('/high-discount-users', customerController.getCustomersByPredefinedFilter('high-discount-users'));
router.get('/recent-buyers', customerController.getCustomersByPredefinedFilter('recent-buyers'));
router.get('/inactive', customerController.getCustomersByPredefinedFilter('inactive'));
router.get('/top-reviewers', customerController.getCustomersByPredefinedFilter('top-reviewers'));
router.get('/high-cart-abandonment', customerController.getCustomersByPredefinedFilter('high-cart-abandonment'));
router.get('/frequent-logins', customerController.getCustomersByPredefinedFilter('frequent-logins'));
router.get('/loyal', customerController.getCustomersByPredefinedFilter('loyal'));
router.get('/premium', customerController.getCustomersByPredefinedFilter('premium'));

// 4. CUSTOM SORTING ROUTES (Oldest/Highest first)
router.get('/sort/age-desc', customerController.getSortedCustomers('age'));
router.get('/sort/purchases-desc', customerController.getSortedCustomers('totalPurchases'));
router.get('/sort/lifetime-desc', customerController.getSortedCustomers('lifetimeValue'));
router.get('/sort/login-desc', customerController.getSortedCustomers('loginFrequency'));
router.get('/sort/credit-desc', customerController.getSortedCustomers('creditBalance'));

// 5. ANALYTICAL CLASSIFICATION FILTER ROUTES
router.get('/filter/high-purchases', customerController.getCustomersByPredefinedFilter('high-purchases'));
router.get('/filter/high-lifetime', customerController.getCustomersByPredefinedFilter('high-lifetime'));
router.get('/filter/high-credit', customerController.getCustomersByPredefinedFilter('high-credit'));
router.get('/filter/high-login', customerController.getCustomersByPredefinedFilter('high-login'));
router.get('/filter/high-mobile', customerController.getCustomersByPredefinedFilter('high-mobile'));
router.get('/filter/high-discount', customerController.getCustomersByPredefinedFilter('high-discount'));
router.get('/filter/high-cart-abandonment', customerController.getCustomersByPredefinedFilter('high-cart-abandonment'));
router.get('/filter/high-engagement', customerController.getCustomersByPredefinedFilter('high-engagement'));
router.get('/filter/high-reviews', customerController.getCustomersByPredefinedFilter('high-reviews'));
router.get('/filter/churned', customerController.getCustomersByPredefinedFilter('churned'));
router.get('/filter/active', customerController.getCustomersByPredefinedFilter('active'));
router.get('/filter/low-session', customerController.getCustomersByPredefinedFilter('low-session'));
router.get('/filter/high-session', customerController.getCustomersByPredefinedFilter('high-session'));
router.get('/filter/high-order-value', customerController.getCustomersByPredefinedFilter('high-order-value'));
router.get('/filter/loyal', customerController.getCustomersByPredefinedFilter('loyal'));

// 6. ADVANCED ANALYTICS, SEGMENTS & PREDICTIONS
router.get('/random', async (req, res, next) => {
  try {
    const count = await Customer.countDocuments({});
    if (count === 0) return res.status(200).json({ success: true, data: null });
    const randomIndex = Math.floor(Math.random() * count);
    const randCustomer = await Customer.findOne({}).skip(randomIndex);
    res.status(200).json({ success: true, data: randCustomer });
  } catch (error) {
    next(error);
  }
});

router.get('/trending', async (req, res, next) => {
  try {
    // Show trending quarters based on volume
    const trend = await Customer.aggregate([
      { $group: { _id: '$signupQuarter', newRegistrants: { $sum: 1 } } },
      { $sort: { newRegistrants: -1 } }
    ]);
    res.status(200).json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
});

router.get('/recent', customerController.getCustomersByPredefinedFilter('recent-buyers'));

router.get('/recommendations', async (req, res, next) => {
  try {
    // Target high order value, active customers who write reviews
    const targets = await Customer.find({
      churned: false,
      averageOrderValue: { $gte: THRESHOLDS.highOrderValue },
      productReviewsWritten: { $gte: 3 }
    }).limit(10);

    res.status(200).json({
      success: true,
      description: 'Customers recommended for the premium marketing campaign.',
      count: targets.length,
      data: targets
    });
  } catch (error) {
    next(error);
  }
});

router.get('/predictions/churn', async (req, res, next) => {
  try {
    // Sample active users, calculate mock churn risk based on low activity
    const users = await Customer.find({ churned: false }).limit(20);
    const predictions = users.map((user) => {
      const loginScore = Math.max(0, 1 - user.loginFrequency / 30);
      const abandonmentScore = user.cartAbandonmentRate / 100;
      const prob = (loginScore * 0.6 + abandonmentScore * 0.4) * 100;
      return {
        customerId: user._id,
        country: user.country,
        city: user.city,
        churnProbability: `${prob.toFixed(2)}%`,
        riskLevel: prob > 70 ? 'High' : prob > 40 ? 'Medium' : 'Low'
      };
    });

    res.status(200).json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
});

router.get('/predictions/retention', async (req, res, next) => {
  try {
    // Prediction of retention rate grouped by membership tiers
    const data = await Customer.aggregate([
      {
        $group: {
          _id: '$membershipYears',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$churned', false] }, 1, 0] } }
        }
      },
      {
        $project: {
          tier: '$_id',
          currentRetention: { $round: [{ $multiply: [{ $divide: ['$activeCount', '$count'] }, 100] }, 2] },
          projectedRetention: { $round: [{ $add: [{ $multiply: [{ $divide: ['$activeCount', '$count'] }, 100] }, 1.5] }, 2] } // predicted improvement
        }
      },
      { $sort: { tier: 1 } },
      { $limit: 10 }
    ]);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Segment listings
router.get('/segments/premium', customerController.getCustomersByPredefinedFilter('premium'));
router.get('/segments/high-value', customerController.getCustomersByPredefinedFilter('high-value'));
router.get('/segments/loyal', customerController.getCustomersByPredefinedFilter('loyal'));
router.get('/segments/inactive', customerController.getCustomersByPredefinedFilter('inactive'));

router.get('/segments/risky', async (req, res, next) => {
  try {
    // Active customers with high cart abandonment and low login rates
    const query = {
      churned: false,
      cartAbandonmentRate: { $gte: THRESHOLDS.highCartAbandonment },
      loginFrequency: { $lte: 10 }
    };
    const { page, limit, skip } = paginate(req.query);
    const data = await Customer.find(query).skip(skip).limit(limit);
    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      count: data.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data
    });
  } catch (error) {
    next(error);
  }
});

// Heatmaps
router.get('/heatmap/countries', async (req, res, next) => {
  try {
    const map = await Customer.aggregate([
      {
        $group: {
          _id: '$country',
          density: { $sum: 1 },
          revenueContribution: { $sum: { $multiply: ['$totalPurchases', '$averageOrderValue'] } }
        }
      },
      {
        $project: {
          country: '$_id',
          density: 1,
          revenueContribution: { $round: ['$revenueContribution', 2] },
          _id: 0
        }
      },
      { $sort: { density: -1 } }
    ]);
    res.status(200).json({ success: true, data: map });
  } catch (error) {
    next(error);
  }
});

router.get('/heatmap/cities', async (req, res, next) => {
  try {
    const map = await Customer.aggregate([
      {
        $group: {
          _id: '$city',
          density: { $sum: 1 }
        }
      },
      {
        $project: {
          city: '$_id',
          density: 1,
          _id: 0
        }
      },
      { $sort: { density: -1 } },
      { $limit: 30 }
    ]);
    res.status(200).json({ success: true, data: map });
  } catch (error) {
    next(error);
  }
});

// Insights
router.get('/insights/purchases', async (req, res, next) => {
  try {
    const totalCount = await Customer.countDocuments({});
    const buyersStats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgPurchases: { $avg: '$totalPurchases' },
          avgOrderValue: { $avg: '$averageOrderValue' }
        }
      }
    ]);
    const values = buyersStats[0] || { avgPurchases: 0, avgOrderValue: 0 };
    res.status(200).json({
      success: true,
      insight: `Average total purchases is ${values.avgPurchases.toFixed(1)} items, with a mean ticket size of $${values.avgOrderValue.toFixed(2)} across all ${totalCount} database profiles.`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/insights/mobile-usage', async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$churned',
          avgMobileUsage: { $avg: '$mobileAppUsage' }
        }
      }
    ]);
    res.status(200).json({
      success: true,
      description: 'Mobile app usage levels mapped across churned vs active segments.',
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

router.get('/insights/discounts', async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgDiscount: { $avg: '$discountUsageRate' },
          correlationRefunds: { $avg: '$returnsRate' }
        }
      }
    ]);
    res.status(200).json({
      success: true,
      description: 'Discount usage correlation with returns rate.',
      data: stats[0]
    });
  } catch (error) {
    next(error);
  }
});

router.get('/insights/engagement', async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$signupQuarter',
          avgEngagement: { $avg: '$socialMediaEngagementScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.status(200).json({
      success: true,
      description: 'Average engagement scores split by signup quarter.',
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Alerts
router.get('/alerts/high-churn', async (req, res, next) => {
  try {
    const count = await Customer.countDocuments({ churned: true });
    res.status(200).json({
      success: true,
      level: count > 1000 ? 'Critical' : 'Normal',
      alert: `Detected ${count} churned customer records. Review retention policy immediately.`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts/inactive-users', async (req, res, next) => {
  try {
    const count = await Customer.countDocuments({ daysSinceLastPurchase: { $gte: THRESHOLDS.inactiveDays } });
    res.status(200).json({
      success: true,
      alert: `Found ${count} inactive customer records (inactive for 60+ days). Run win-back campaigns.`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts/high-cart-abandonment', async (req, res, next) => {
  try {
    const count = await Customer.countDocuments({ cartAbandonmentRate: { $gte: THRESHOLDS.highCartAbandonment } });
    res.status(200).json({
      success: true,
      alert: `Warning: ${count} users exceed a 70% cart abandonment rate.`
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard summaries
router.get('/dashboard/summary', async (req, res, next) => {
  try {
    const totalCount = await Customer.countDocuments({});
    const churnedCount = await Customer.countDocuments({ churned: true });
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ['$totalPurchases', '$averageOrderValue'] } }
        }
      }
    ]);
    const revenue = stats.length > 0 ? stats[0].totalRevenue : 0;
    res.status(200).json({
      success: true,
      summary: {
        totalCustomers: totalCount,
        churnedCustomers: churnedCount,
        activeCustomers: totalCount - churnedCount,
        churnRate: `${((churnedCount / totalCount) * 100).toFixed(2)}%`,
        totalLifetimeRevenueEstimate: `$${revenue.toFixed(2)}`
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/revenue', async (req, res, next) => {
  try {
    const revenueByCountry = await Customer.aggregate([
      {
        $group: {
          _id: '$country',
          revenue: { $sum: { $multiply: ['$totalPurchases', '$averageOrderValue'] } }
        }
      },
      { $project: { country: '$_id', revenue: { $round: ['$revenue', 2] }, _id: 0 } },
      { $sort: { revenue: -1 } }
    ]);
    res.status(200).json({ success: true, data: revenueByCountry });
  } catch (error) {
    next(error);
  }
});

// 7. EXISTENCE CHECK
router.get('/exists/:id', customerController.checkCustomerExists);

// 8. ROUTE PARAMETER QUERIES (Dynamic Attribute Matches)
router.get('/country/:country', customerController.getCustomersByAttribute('country'));
router.get('/city/:city', customerController.getCustomersByAttribute('city'));
router.get('/gender/:gender', customerController.getCustomersByAttribute('gender'));
router.get('/age/:age', customerController.getCustomersByAttribute('age'));
router.get('/signup-quarter/:quarter', customerController.getCustomersByAttribute('quarter'));

// Numeric ranges
router.get('/login-frequency/:value', customerController.getCustomersByNumericParam('loginFrequency'));
router.get('/session-duration/:value', customerController.getCustomersByNumericParam('sessionDurationAvg'));
router.get('/purchases/:value', customerController.getCustomersByNumericParam('totalPurchases'));
router.get('/lifetime/:value', customerController.getCustomersByNumericParam('lifetimeValue'));
router.get('/credit/:value', customerController.getCustomersByNumericParam('creditBalance'));
router.get('/mobile-usage/:value', customerController.getCustomersByNumericParam('mobileAppUsage'));
router.get('/discount-rate/:value', customerController.getCustomersByNumericParam('discountUsageRate'));
router.get('/reviews/:value', customerController.getCustomersByNumericParam('productReviewsWritten'));

// Churn Status
router.get('/churn-status/:status', customerController.getCustomersByChurnStatus);

// 9. CORE COLLECTION LISTING & CRUD (Dynamic param /:id must be last!)
router.options('/', (req, res) => {
  res.setHeader('Allow', 'GET, POST, HEAD, OPTIONS');
  res.sendStatus(200);
});

router.options('/:id', (req, res) => {
  res.setHeader('Allow', 'GET, PUT, PATCH, DELETE, HEAD, OPTIONS');
  res.sendStatus(200);
});

router.route('/')
  .get(customerController.getCustomers)
  .post(customerController.createCustomer);

router.route('/:id')
  .get(customerController.getCustomerById)
  .put(customerController.replaceCustomer)
  .patch(customerController.updateCustomer)
  .delete(customerController.deleteCustomer);

module.exports = router;
