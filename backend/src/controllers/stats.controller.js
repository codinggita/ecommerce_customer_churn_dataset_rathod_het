const Customer = require('../models/customer.model');

// helper for simple field averages
const getFieldAverage = async (field, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          averageValue: { $avg: `$${field}` }
        }
      }
    ]);

    const average = stats.length > 0 ? parseFloat(stats[0].averageValue.toFixed(2)) : 0;
    res.status(200).json({
      success: true,
      data: {
        field,
        average
      }
    });
  } catch (error) {
    next(error);
  }
};

// helper for counting categories
const getCategoryCounts = async (field, res, next) => {
  try {
    const counts = await Customer.aggregate([
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: counts
    });
  } catch (error) {
    next(error);
  }
};

// Count total customers
exports.getCount = async (req, res, next) => {
  try {
    const count = await Customer.countDocuments({});
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

// Averages
exports.getAverageAge = (req, res, next) => getFieldAverage('age', res, next);
exports.getAverageLifetime = (req, res, next) => getFieldAverage('lifetimeValue', res, next);
exports.getAverageCredit = (req, res, next) => getFieldAverage('creditBalance', res, next);
exports.getAverageOrderValue = (req, res, next) => getFieldAverage('averageOrderValue', res, next);

// Extremes
exports.getHighestPurchases = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({}).sort({ totalPurchases: -1 });
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.getHighestLifetime = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({}).sort({ lifetimeValue: -1 });
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.getHighestCredit = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({}).sort({ creditBalance: -1 });
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// Category Counts
exports.getCountryCount = (req, res, next) => getCategoryCounts('country', res, next);
exports.getCityCount = (req, res, next) => getCategoryCounts('city', res, next);
exports.getGenderCount = (req, res, next) => getCategoryCounts('gender', res, next);
exports.getSignupQuarterCount = (req, res, next) => getCategoryCounts('signupQuarter', res, next);

// Count Churned Customers
exports.getChurnCount = async (req, res, next) => {
  try {
    const churned = await Customer.countDocuments({ churned: true });
    const active = await Customer.countDocuments({ churned: false });
    res.status(200).json({
      success: true,
      data: {
        churned,
        active,
        total: churned + active
      }
    });
  } catch (error) {
    next(error);
  }
};

// Count Total Product Reviews
exports.getReviewCount = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: '$productReviewsWritten' }
        }
      }
    ]);

    const count = stats.length > 0 ? stats[0].totalReviews : 0;
    res.status(200).json({ success: true, data: { totalReviews: count } });
  } catch (error) {
    next(error);
  }
};

// Mobile Usage statistics
exports.getMobileUsageStats = async (req, res, next) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgMobileUsage: { $avg: '$mobileAppUsage' },
          maxMobileUsage: { $max: '$mobileAppUsage' }
        }
      }
    ]);

    const data = stats.length > 0 ? {
      avgMobileUsage: parseFloat(stats[0].avgMobileUsage.toFixed(2)),
      maxMobileUsage: stats[0].maxMobileUsage
    } : { avgMobileUsage: 0, maxMobileUsage: 0 };

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
