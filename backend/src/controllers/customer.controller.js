const Customer = require('../models/customer.model');
const buildFilters = require('../utils/filterBuilder');
const paginate = require('../utils/pagination');

// Helper to map query sort parameter to database fields
const getSortCriteria = (sortParam) => {
  const criteria = {};
  if (!sortParam) return { createdAt: -1 }; // Default sort

  // Map camelCase sort queries to Schema properties
  const fieldMapping = {
    age: 'age',
    membershipYears: 'membershipYears',
    loginFrequency: 'loginFrequency',
    sessionDuration: 'sessionDurationAvg',
    purchases: 'totalPurchases',
    averageOrderValue: 'averageOrderValue',
    lifetimeValue: 'lifetimeValue',
    creditBalance: 'creditBalance',
    discountRate: 'discountUsageRate',
    mobileUsage: 'mobileAppUsage'
  };

  const dbField = fieldMapping[sortParam];
  if (dbField) {
    criteria[dbField] = 1; // Default ascending for general query sorting
  } else {
    criteria[sortParam] = 1;
  }
  return criteria;
};

// Threshold constants based on dataset statistics (Checklist & Implementation Plan)
const THRESHOLDS = {
  highLifetime: 2000,
  highPurchases: 15,
  highCredit: 2500,
  highEngagement: 40,
  highMobile: 25,
  highDiscount: 50,
  highCartAbandonment: 70,
  frequentLogins: 15,
  loyalYears: 4,
  recentDays: 15,
  inactiveDays: 60,
  lowSession: 15,
  highSession: 35,
  highOrderValue: 140
};

/**
 * @desc    Fetch all customers with filtering, sorting, and pagination
 * @route   GET /customers
 */
exports.getCustomers = async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);
    const { page, limit, skip } = paginate(req.query);
    const sort = getSortCriteria(req.query.sort);

    const customers = await Customer.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch single customer by ID
 * @route   GET /customers/:id
 */
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `Customer not found with ID: ${req.params.id}`
      });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check whether customer exists or not
 * @route   GET /customers/exists/:id
 */
exports.checkCustomerExists = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).select('_id');
    res.status(200).json({
      success: true,
      exists: !!customer
    });
  } catch (error) {
    // If it's a cast error, it's an invalid ID, hence doesn't exist
    if (error.name === 'CastError') {
      return res.status(200).json({ success: true, exists: false });
    }
    next(error);
  }
};

/**
 * @desc    Add a new customer record
 * @route   POST /customers
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Replace complete customer record (PUT)
 * @route   PUT /customers/:id
 */
exports.replaceCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      overwrite: true, // Replace complete document
      runValidators: true
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update specific customer fields (PATCH)
 * @route   PATCH /customers/:id
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove customer record from database
 * @route   DELETE /customers/:id
 */
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.status(200).json({
      success: true,
      message: `Customer ${req.params.id} removed successfully.`,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk create customers
 * @route   POST /customers/bulk-create
 */
exports.bulkCreateCustomers = async (req, res, next) => {
  try {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Payload must be a non-empty array of records.' });
    }

    const inserted = await Customer.insertMany(records);
    res.status(201).json({
      success: true,
      message: `Successfully inserted ${inserted.length} customer records.`,
      count: inserted.length,
      data: inserted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update customers
 * @route   PATCH /customers/bulk-update
 */
exports.bulkUpdateCustomers = async (req, res, next) => {
  try {
    const updates = req.body; // Expects: [{ id: "...", age: 31 }, { id: "...", country: "Canada" }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Payload must be a non-empty array of updates.' });
    }

    const bulkOps = updates.map((item) => {
      const { id, ...fields } = item;
      return {
        updateOne: {
          filter: { _id: id },
          update: { $set: fields }
        }
      };
    });

    const result = await Customer.bulkWrite(bulkOps);
    res.status(200).json({
      success: true,
      message: `Successfully executed bulk update operation.`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk delete customers
 * @route   DELETE /customers/bulk-delete
 */
exports.bulkDeleteCustomers = async (req, res, next) => {
  try {
    const { ids } = req.body; // Expects: { ids: ["...", "..."] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Payload must contain a non-empty array of "ids".' });
    }

    const result = await Customer.deleteMany({ _id: { $in: ids } });
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} customer records.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================================
   CUSTOMER DATA & ROUTE PARAMETER RETRIEVAL
   ========================================================================= */

// Wrapper for simple attribute matches (Country, City, Gender, Signup Quarter, etc.)
exports.getCustomersByAttribute = (attributeField) => async (req, res, next) => {
  try {
    const paramVal = req.params[attributeField];
    const filters = buildFilters(req.query);
    
    // Add the specific attribute filter dynamically
    if (attributeField === 'quarter') {
      filters.signupQuarter = { $regex: new RegExp(`^${paramVal}$`, 'i') };
    } else if (attributeField === 'age') {
      const parsedAge = parseFloat(paramVal);
      if (isNaN(parsedAge)) {
        return res.status(400).json({ success: false, message: 'Age parameter must be a valid number.' });
      }
      filters.age = parsedAge;
    } else {
      filters[attributeField] = { $regex: new RegExp(`^${paramVal}$`, 'i') };
    }

    const { page, limit, skip } = paginate(req.query);
    const sort = getSortCriteria(req.query.sort);

    const customers = await Customer.find(filters).sort(sort).skip(skip).limit(limit);
    const total = await Customer.countDocuments(filters);

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

// Generic numeric threshold parameter filter (e.g. purchases/:value -> totalPurchases >= value)
exports.getCustomersByNumericParam = (field, operator = '$gte') => async (req, res, next) => {
  try {
    const value = parseFloat(req.params.value);
    if (isNaN(value)) {
      return res.status(400).json({ success: false, message: `Parameter value must be a valid number.` });
    }

    const filters = buildFilters(req.query);
    filters[field] = { [operator]: value };

    const { page, limit, skip } = paginate(req.query);
    const sort = getSortCriteria(req.query.sort);

    const customers = await Customer.find(filters).sort(sort).skip(skip).limit(limit);
    const total = await Customer.countDocuments(filters);

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

// Fetch customers by Churn Status route param
exports.getCustomersByChurnStatus = async (req, res, next) => {
  try {
    const statusParam = String(req.params.status).toLowerCase();
    let churnVal;

    if (statusParam === '1' || statusParam === 'churned' || statusParam === 'true') {
      churnVal = true;
    } else if (statusParam === '0' || statusParam === 'active' || statusParam === 'false') {
      churnVal = false;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid churn status. Allowed values: '1', '0', 'churned', 'active', 'true', 'false'."
      });
    }

    const filters = buildFilters(req.query);
    filters.churned = churnVal;

    const { page, limit, skip } = paginate(req.query);
    const sort = getSortCriteria(req.query.sort);

    const customers = await Customer.find(filters).sort(sort).skip(skip).limit(limit);
    const total = await Customer.countDocuments(filters);

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

/* =========================================================================
   ANALYTICAL CLASSIFICATION FILTER ROUTES
   ========================================================================= */

// Controller builder to query defined thresholds (e.g. loyal, high-value, active)
exports.getCustomersByPredefinedFilter = (filterKey) => async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);

    switch (filterKey) {
      case 'churned':
        filters.churned = true;
        break;
      case 'active':
        filters.churned = false;
        break;
      case 'high-value':
      case 'high-lifetime':
        filters.lifetimeValue = { $gte: THRESHOLDS.highLifetime };
        break;
      case 'high-purchases':
        filters.totalPurchases = { $gte: THRESHOLDS.highPurchases };
        break;
      case 'high-credit':
        filters.creditBalance = { $gte: THRESHOLDS.highCredit };
        break;
      case 'high-engagement':
        filters.socialMediaEngagementScore = { $gte: THRESHOLDS.highEngagement };
        break;
      case 'high-mobile':
      case 'high-mobile-usage':
        filters.mobileAppUsage = { $gte: THRESHOLDS.highMobile };
        break;
      case 'high-discount':
      case 'high-discount-users':
        filters.discountUsageRate = { $gte: THRESHOLDS.highDiscount };
        break;
      case 'recent-buyers':
        filters.daysSinceLastPurchase = { $lte: THRESHOLDS.recentDays };
        break;
      case 'inactive':
        filters.daysSinceLastPurchase = { $gte: THRESHOLDS.inactiveDays };
        break;
      case 'top-reviewers':
      case 'high-reviews':
        filters.productReviewsWritten = { $gte: 5 };
        break;
      case 'high-cart-abandonment':
        filters.cartAbandonmentRate = { $gte: THRESHOLDS.highCartAbandonment };
        break;
      case 'frequent-logins':
      case 'high-login':
        filters.loginFrequency = { $gte: THRESHOLDS.frequentLogins };
        break;
      case 'loyal':
        filters.membershipYears = { $gte: THRESHOLDS.loyalYears };
        break;
      case 'premium':
        filters.lifetimeValue = { $gte: THRESHOLDS.highLifetime };
        filters.membershipYears = { $gte: 3 };
        break;
      case 'low-session':
        filters.sessionDurationAvg = { $lt: THRESHOLDS.lowSession };
        break;
      case 'high-session':
        filters.sessionDurationAvg = { $gt: THRESHOLDS.highSession };
        break;
      case 'high-order-value':
        filters.averageOrderValue = { $gte: THRESHOLDS.highOrderValue };
        break;
      default:
        break;
    }

    const { page, limit, skip } = paginate(req.query);
    const sort = getSortCriteria(req.query.sort);

    const customers = await Customer.find(filters).sort(sort).skip(skip).limit(limit);
    const total = await Customer.countDocuments(filters);

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

/* =========================================================================
   SEARCH ROUTE IMPLEMENTATION
   ========================================================================= */

/**
 * @desc    Unified Regex Keyword and Analytics Search Route
 * @route   GET /search/customers
 */
exports.searchCustomers = async (req, res, next) => {
  try {
    const queryStr = req.query.q;
    if (!queryStr || queryStr.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter "q" is required.'
      });
    }

    const queryClean = queryStr.trim().toLowerCase();
    let filters = {};

    // 1. Check if the search query matches an analytical keyword
    if (queryClean === 'high-value') {
      filters.lifetimeValue = { $gte: THRESHOLDS.highLifetime };
    } else if (queryClean === 'loyal') {
      filters.membershipYears = { $gte: THRESHOLDS.loyalYears };
    } else if (queryClean === 'inactive') {
      filters.daysSinceLastPurchase = { $gte: THRESHOLDS.inactiveDays };
    } else if (queryClean === 'mobile') {
      filters.mobileAppUsage = { $gte: THRESHOLDS.highMobile };
    } else if (queryClean === 'discount') {
      filters.discountUsageRate = { $gte: THRESHOLDS.highDiscount };
    } else if (queryClean === 'cart') {
      filters.cartAbandonmentRate = { $gte: THRESHOLDS.highCartAbandonment };
    } else if (queryClean === 'reviews') {
      filters.productReviewsWritten = { $gte: 5 };
    } else if (queryClean === 'credit') {
      filters.creditBalance = { $gte: THRESHOLDS.highCredit };
    } else if (queryClean === 'engagement') {
      filters.socialMediaEngagementScore = { $gte: THRESHOLDS.highEngagement };
    } else if (queryClean === 'churned') {
      filters.churned = true;
    } else if (queryClean === 'premium') {
      filters.lifetimeValue = { $gte: THRESHOLDS.highLifetime };
      filters.membershipYears = { $gte: 3 };
    } else {
      // 2. Perform general text search using case-insensitive Regex (Good to Have Checklist item #9)
      const regex = new RegExp(queryClean, 'i');
      filters.$or = [
        { country: regex },
        { city: regex },
        { gender: regex },
        { signupQuarter: regex }
      ];
    }

    const { page, limit, skip } = paginate(req.query);
    const sort = getSortCriteria(req.query.sort);

    const customers = await Customer.find(filters).sort(sort).skip(skip).limit(limit);
    const total = await Customer.countDocuments(filters);

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

/* =========================================================================
   CUSTOM EXPORT SORTING ROUTES
   ========================================================================= */

// Controller mapping for descending sorting routes: Sort older, higher purchases, etc. first
exports.getSortedCustomers = (sortField) => async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);
    const { page, limit, skip } = paginate(req.query);
    
    // Custom sort descriptor
    const sortObj = {};
    sortObj[sortField] = -1; // Descending (oldest/highest first)

    const customers = await Customer.find(filters).sort(sortObj).skip(skip).limit(limit);
    const total = await Customer.countDocuments(filters);

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
