const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// Top-Ranked Metrics
router.get('/customers/top-buyers', analyticsController.getTopBuyers);
router.get('/customers/top-lifetime', analyticsController.getTopLifetime);
router.get('/customers/top-credit', analyticsController.getTopCredit);
router.get('/customers/top-engagement', analyticsController.getTopEngagement);
router.get('/customers/top-mobile-users', analyticsController.getTopMobileUsers);
router.get('/customers/top-discount-users', analyticsController.getTopDiscountUsers);
router.get('/customers/top-reviewers', analyticsController.getTopReviewers);

// Aggregations
router.get('/customers/churn-analysis', analyticsController.getChurnAnalysis);
router.get('/customers/retention', analyticsController.getRetentionAnalysis);
router.get('/customers/session-analysis', analyticsController.getSessionAnalysis);
router.get('/customers/purchase-analysis', analyticsController.getPurchaseAnalysis);
router.get('/customers/country-analysis', analyticsController.getCountryAnalysis);
router.get('/customers/city-analysis', analyticsController.getCityAnalysis);
router.get('/customers/signup-analysis', analyticsController.getSignupAnalysis);
router.get('/customers/payment-analysis', analyticsController.getPaymentAnalysis);

module.exports = router;
