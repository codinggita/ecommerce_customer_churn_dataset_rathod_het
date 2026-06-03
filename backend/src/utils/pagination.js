/**
 * Validates and calculates pagination parameters (page, limit, skip).
 * Throws explicit errors if page or limit values are invalid or negative.
 */
const paginate = (query) => {
  let page = 1;
  let limit = 10;

  if (query.page !== undefined) {
    page = parseInt(query.page, 10);
    if (isNaN(page) || page <= 0) {
      const err = new Error('Page parameter must be a positive integer.');
      err.statusCode = 400;
      throw err;
    }
  }

  if (query.limit !== undefined) {
    limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit <= 0) {
      const err = new Error('Limit parameter must be a positive integer.');
      err.statusCode = 400;
      throw err;
    }
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

module.exports = paginate;
