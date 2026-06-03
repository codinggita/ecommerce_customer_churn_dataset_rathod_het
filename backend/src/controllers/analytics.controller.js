const Customer = require('../models/customer.model');
const paginate = require('../utils/pagination');

// Top Buyers
exports.getTopBuyers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ totalPurchases: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Top Lifetime Value
exports.getTopLifetime = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ lifetimeValue: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Top Credit Balance
exports.getTopCredit = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ creditBalance: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Top Engagement
exports.getTopEngagement = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ socialMediaEngagementScore: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Top Mobile Users
exports.getTopMobileUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ mobileAppUsage: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Top Discount Users
exports.getTopDiscountUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ discountUsageRate: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Top Reviewers
exports.getTopReviewers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const customers = await Customer.find({})
      .sort({ productReviewsWritten: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Customer.countDocuments({});

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// Churn Analysis Aggregation
exports.getChurnAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$churned',
          count: { $sum: 1 },
          avgLifetimeValue: { $avg: '$lifetimeValue' },
          avgAge: { $avg: '$age' },
          avgPurchases: { $avg: '$totalPurchases' },
          avgCreditBalance: { $avg: '$creditBalance' }
        }
      },
      {
        $project: {
          churnStatus: '$_id',
          count: 1,
          avgLifetimeValue: { $round: ['$avgLifetimeValue', 2] },
          avgAge: { $round: ['$avgAge', 1] },
          avgPurchases: { $round: ['$avgPurchases', 1] },
          avgCreditBalance: { $round: ['$avgCreditBalance', 2] }
        }
      }
    ]);

    const totalCount = await Customer.countDocuments({});
    const churnCount = await Customer.countDocuments({ churned: true });

    res.status(200).json({
      success: true,
      summary: {
        totalCustomers: totalCount,
        churnedCustomers: churnCount,
        activeCustomers: totalCount - churnCount,
        overallChurnRate: totalCount > 0 ? parseFloat(((churnCount / totalCount) * 100).toFixed(2)) : 0
      },
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Customer Retention Analysis
exports.getRetentionAnalysis = async (req, res, next) => {
  try {
    // Group by membership years to see how long-term customers remain active vs churned
    const retentionData = await Customer.aggregate([
      {
        $bucket: {
          groupBy: '$membershipYears',
          boundaries: [0, 1, 2, 3, 5, 10, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            churnCount: { $sum: { $cond: [{ $eq: ['$churned', true] }, 1, 0] } }
          }
        }
      },
      {
        $project: {
          yearsRange: '$_id',
          count: 1,
          churnCount: 1,
          retentionRate: {
            $round: [
              {
                $multiply: [
                  { $subtract: [1, { $divide: ['$churnCount', '$count'] }] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: retentionData
    });
  } catch (error) {
    next(error);
  }
};

// Session Analysis
exports.getSessionAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
          avgSessionDuration: { $avg: '$sessionDurationAvg' },
          avgPagesPerSession: { $avg: '$pagesPerSession' },
          avgCartAbandonment: { $avg: '$cartAbandonmentRate' }
        }
      },
      {
        $project: {
          gender: '$_id',
          count: 1,
          avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
          avgPagesPerSession: { $round: ['$avgPagesPerSession', 2] },
          avgCartAbandonment: { $round: ['$avgCartAbandonment', 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Purchase Analysis
exports.getPurchaseAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$signupQuarter',
          count: { $sum: 1 },
          avgPurchases: { $avg: '$totalPurchases' },
          avgOrderValue: { $avg: '$averageOrderValue' },
          totalSpent: { $sum: { $multiply: ['$totalPurchases', '$averageOrderValue'] } }
        }
      },
      {
        $project: {
          signupQuarter: '$_id',
          count: 1,
          avgPurchases: { $round: ['$avgPurchases', 2] },
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          totalSpent: { $round: ['$totalSpent', 2] }
        }
      },
      { $sort: { signupQuarter: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Country Wise Analysis
exports.getCountryAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 },
          avgLifetimeValue: { $avg: '$lifetimeValue' },
          avgCreditBalance: { $avg: '$creditBalance' },
          churnCount: { $sum: { $cond: [{ $eq: ['$churned', true] }, 1, 0] } }
        }
      },
      {
        $project: {
          country: '$_id',
          count: 1,
          avgLifetimeValue: { $round: ['$avgLifetimeValue', 2] },
          avgCreditBalance: { $round: ['$avgCreditBalance', 2] },
          churnRate: {
            $round: [{ $multiply: [{ $divide: ['$churnCount', '$count'] }, 100] }, 2]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// City Wise Analysis
exports.getCityAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          avgLifetimeValue: { $avg: '$lifetimeValue' },
          churnCount: { $sum: { $cond: [{ $eq: ['$churned', true] }, 1, 0] } }
        }
      },
      {
        $project: {
          city: '$_id',
          count: 1,
          avgLifetimeValue: { $round: ['$avgLifetimeValue', 2] },
          churnRate: {
            $round: [{ $multiply: [{ $divide: ['$churnCount', '$count'] }, 100] }, 2]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 } // Limit to top 20 cities for readable display
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Signup Quarter Analysis
exports.getSignupAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$signupQuarter',
          count: { $sum: 1 },
          avgAge: { $avg: '$age' },
          avgMembership: { $avg: '$membershipYears' }
        }
      },
      {
        $project: {
          signupQuarter: '$_id',
          count: 1,
          avgAge: { $round: ['$avgAge', 1] },
          avgMembership: { $round: ['$avgMembership', 2] }
        }
      },
      { $sort: { signupQuarter: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Payment Method Diversity Analysis
exports.getPaymentAnalysis = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$paymentMethodDiversity',
          count: { $sum: 1 },
          avgLifetimeValue: { $avg: '$lifetimeValue' },
          avgPurchases: { $avg: '$totalPurchases' }
        }
      },
      {
        $project: {
          paymentMethodDiversity: '$_id',
          count: 1,
          avgLifetimeValue: { $round: ['$avgLifetimeValue', 2] },
          avgPurchases: { $round: ['$avgPurchases', 2] }
        }
      },
      { $sort: { paymentMethodDiversity: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
