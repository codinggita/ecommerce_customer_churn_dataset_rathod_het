const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimit');

// Registration & Login
router.options('/login', (req, res) => {
  res.setHeader('Allow', 'POST, OPTIONS');
  res.sendStatus(200);
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', protect, authController.logout);

// Profile Management
router.route('/profile')
  .get(protect, authController.getProfile)
  .patch(protect, authController.updateProfile)
  .delete(protect, authController.deleteProfile);

// Password Management
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', protect, authController.changePassword);

// OTP Verification & Resending
router.post('/verify-email', authController.verifyEmail);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-verification', authController.resendVerification);

// Session Actions
router.route('/session')
  .get(protect, authController.getSession)
  .delete(protect, authController.clearSession);

module.exports = router;
