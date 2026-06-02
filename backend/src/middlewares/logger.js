/**
 * Request Logger Middleware
 * Logs incoming HTTP request details, including method, URL, response status, and duration.
 */
const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
};

module.exports = logger;
