/**
 * Request Timing Middleware
 * Tracks request execution duration and attaches 'X-Response-Time' header.
 */
const requestTime = (req, res, next) => {
  const start = Date.now();

  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalWriteHead.apply(this, args);
  };

  next();
};

module.exports = requestTime;
