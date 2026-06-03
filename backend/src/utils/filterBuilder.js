/**
 * Dynamically constructs a MongoDB filter object from request query parameters.
 * Supports string search, numeric ranges, quarter mapping, and boolean conversions.
 */
const buildFilters = (query) => {
  const filter = {};

  if (query.country) {
    filter.country = { $regex: new RegExp(`^${query.country}$`, 'i') };
  }

  if (query.city) {
    filter.city = { $regex: new RegExp(`^${query.city}$`, 'i') };
  }

  if (query.gender) {
    filter.gender = { $regex: new RegExp(`^${query.gender}$`, 'i') };
  }

  // Age filters (single and range)
  if (query.minAge || query.maxAge) {
    filter.age = {};
    if (query.minAge) {
      const minAge = parseFloat(query.minAge);
      if (!isNaN(minAge)) filter.age.$gte = minAge;
    }
    if (query.maxAge) {
      const maxAge = parseFloat(query.maxAge);
      if (!isNaN(maxAge)) filter.age.$lte = maxAge;
    }
  }

  if (query.membershipYears) {
    const years = parseFloat(query.membershipYears);
    if (!isNaN(years)) filter.membershipYears = years;
  }

  if (query.minPurchases) {
    const val = parseFloat(query.minPurchases);
    if (!isNaN(val)) filter.totalPurchases = { $gte: val };
  }

  if (query.minLifetime) {
    const val = parseFloat(query.minLifetime);
    if (!isNaN(val)) filter.lifetimeValue = { $gte: val };
  }

  if (query.minCredit) {
    const val = parseFloat(query.minCredit);
    if (!isNaN(val)) filter.creditBalance = { $gte: val };
  }

  if (query.churned !== undefined && query.churned !== null && query.churned !== '') {
    const val = String(query.churned).toLowerCase();
    filter.churned = val === '1' || val === 'true';
  }

  if (query.signupQuarter) {
    filter.signupQuarter = { $regex: new RegExp(`^${query.signupQuarter}$`, 'i') };
  }

  if (query.minLoginFrequency) {
    const val = parseFloat(query.minLoginFrequency);
    if (!isNaN(val)) filter.loginFrequency = { $gte: val };
  }

  if (query.minMobileUsage) {
    const val = parseFloat(query.minMobileUsage);
    if (!isNaN(val)) filter.mobileAppUsage = { $gte: val };
  }

  if (query.minDiscountRate) {
    const val = parseFloat(query.minDiscountRate);
    if (!isNaN(val)) filter.discountUsageRate = { $gte: val };
  }

  if (query.minSessionDuration) {
    const val = parseFloat(query.minSessionDuration);
    if (!isNaN(val)) filter.sessionDurationAvg = { $gte: val };
  }

  return filter;
};

module.exports = buildFilters;
