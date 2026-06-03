const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');

// OPTIONS /search/customers - Check supported methods
router.options('/', (req, res) => {
  res.setHeader('Allow', 'GET, OPTIONS');
  res.sendStatus(200);
});

// GET /search/customers?q=...
router.get('/', customerController.searchCustomers);

module.exports = router;
