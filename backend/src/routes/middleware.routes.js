const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { generalLimiter } = require('../middlewares/rateLimit');

// 1. GET /middleware/logger - Test logging
router.get('/logger', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logger middleware test endpoint. Check server console for method, URL and execution metrics.'
  });
});

// 2. GET /middleware/auth - Test authorization
router.get('/auth', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication middleware test successful. You are authorized.',
    data: {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// 3. GET /middleware/rate-limit - Test rate limiting
router.get('/rate-limit', generalLimiter, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Rate limit test. Repeated hits to this endpoint will eventually trigger a 429 Too Many Requests response.'
  });
});

// 4. GET /middleware/error-handler - Test global error handler
router.get('/error-handler', (req, res, next) => {
  // Generate a synthetic error to trigger the global error handler middleware
  const err = new Error('Test Error: Synthetic error generated to test global error handling middleware.');
  err.statusCode = 400;
  next(err);
});

// 5. GET /middleware/request-time - Test response headers
router.get('/request-time', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Request timing test. Check the response headers for the "X-Response-Time" header.'
  });
});

module.exports = router;
