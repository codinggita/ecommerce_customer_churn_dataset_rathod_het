const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Customer = require('../models/customer.model');
const RevokedToken = require('../models/revokedToken.model');

// Helper to generate access tokens
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'ecommerce_customer_analytics_jwt_access_key_2026_top_secret',
    { expiresIn: '1d' }
  );
};

// Helper to generate refresh tokens
const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET || 'ecommerce_customer_analytics_jwt_refresh_key_2026_top_secret',
    { expiresIn: '7d' }
  );
};

// Helper to generate a 6-digit random numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Register a new customer account
 * @route   POST /auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, gender, age, country, city } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Check duplicate
    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate validation OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Create Customer with default/provided analytics fields
    const customer = await Customer.create({
      email,
      password: hashedPassword,
      gender: gender || 'Other',
      age: age || 30,
      country: country || 'France',
      city: city || 'Paris',
      membershipYears: 0,
      loginFrequency: 0,
      sessionDurationAvg: 0,
      pagesPerSession: 0,
      cartAbandonmentRate: 0,
      wishlistItems: 0,
      totalPurchases: 0,
      averageOrderValue: 0,
      daysSinceLastPurchase: 0,
      discountUsageRate: 0,
      returnsRate: 0,
      emailOpenRate: 0,
      customerServiceCalls: 0,
      productReviewsWritten: 0,
      socialMediaEngagementScore: 0,
      mobileAppUsage: 0,
      paymentMethodDiversity: 0,
      lifetimeValue: 0,
      creditBalance: 0,
      churned: false,
      signupQuarter: 'Q3',
      otp,
      otpExpiry,
      isVerified: false
    });

    console.log(`[Email Verification OTP sent to ${email}]: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verify your email with the OTP.',
      otp, // Exposed in response for easy testing
      data: {
        id: customer._id,
        email: customer.email,
        isVerified: customer.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login customer
 * @route   POST /auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find and select password
    const customer = await Customer.findOne({ email }).select('+password +role');
    if (!customer) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(customer._id);
    const refreshToken = generateRefreshToken(customer._id);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      refreshToken,
      data: {
        id: customer._id,
        email: customer.email,
        role: customer.role,
        isVerified: customer.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout customer
 * @route   POST /auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const token = req.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'No active session token found.' });
    }

    // Blacklist token
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    await RevokedToken.create({ token, expiresAt });

    res.status(200).json({
      success: true,
      message: 'Logout successful.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch authenticated profile
 * @route   GET /auth/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update profile
 * @route   PATCH /auth/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = { ...req.body };
    // Prevent direct password updates from profile PATCH
    delete fieldsToUpdate.password;
    delete fieldsToUpdate.role;

    const customer = await Customer.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete profile
 * @route   DELETE /auth/profile
 */
exports.deleteProfile = async (req, res, next) => {
  try {
    await Customer.findByIdAndDelete(req.user._id);

    // Blacklist current token immediately
    const decoded = jwt.decode(req.token);
    await RevokedToken.create({
      token: req.token,
      expiresAt: new Date(decoded.exp * 1000)
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset OTP
 * @route   POST /auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email.' });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Email not registered.' });
    }

    const otp = generateOTP();
    customer.otp = otp;
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await customer.save();

    console.log(`[Password Reset OTP sent to ${email}]: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'Reset OTP sent.',
      otp // Exposed for testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using OTP
 * @route   POST /auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields (email, otp, newPassword) are required.' });
    }

    const customer = await Customer.findOne({ email, otp }).select('+password');
    if (!customer || !customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Reset password
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);
    customer.otp = null;
    customer.otpExpiry = null;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change current password
 * @route   POST /auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Old and new passwords are required.' });
    }

    const customer = await Customer.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password.' });
    }

    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email using OTP
 * @route   POST /auth/verify-email
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const customer = await Customer.findOne({ email, otp });
    if (!customer || !customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    customer.isVerified = true;
    customer.otp = null;
    customer.otpExpiry = null;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send OTP code manually
 * @route   POST /auth/send-otp
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otp = generateOTP();
    customer.otp = otp;
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await customer.save();

    console.log(`[Manual OTP sent to ${email}]: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent.',
      otp // Exposed for testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /auth/verify-otp
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const customer = await Customer.findOne({ email, otp });
    if (!customer || !customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    res.status(200).json({
      success: true,
      message: 'OTP matches successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification
 * @route   POST /auth/resend-verification
 */
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otp = generateOTP();
    customer.otp = otp;
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await customer.save();

    console.log(`[Resent OTP to ${email}]: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'Verification email resent.',
      otp // Exposed for testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch active login session
 * @route   GET /auth/session
 */
exports.getSession = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      session: {
        active: true,
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout all active sessions (blacklists current session token)
 * @route   DELETE /auth/session
 */
exports.clearSession = async (req, res, next) => {
  try {
    // REVOKE CURRENT SESSION TOKEN
    const token = req.token;
    const decoded = jwt.decode(token);
    await RevokedToken.create({
      token,
      expiresAt: new Date(decoded.exp * 1000)
    });

    res.status(200).json({
      success: true,
      message: 'Current session ended. All sessions logged out.'
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================================
   JWT-SPECIFIC ENDPOINTS
   ========================================================================= */

/**
 * @desc    Generate JWT Token manually
 * @route   POST /jwt/generate-token
 */
exports.jwtGenerateToken = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required.' });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User matching email not found.' });
    }

    const token = generateToken(customer._id);
    const refreshToken = generateRefreshToken(customer._id);

    res.status(200).json({
      success: true,
      token,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify JWT Token manually
 * @route   POST /jwt/verify-token
 */
exports.jwtVerifyToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required.' });
    }

    // Verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ecommerce_customer_analytics_jwt_access_key_2026_top_secret');

    res.status(200).json({
      success: true,
      valid: true,
      decoded
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      valid: false,
      message: error.message
    });
  }
};

/**
 * @desc    Refresh JWT access token
 * @route   POST /jwt/refresh-token
 */
exports.jwtRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'ecommerce_customer_analytics_jwt_refresh_key_2026_top_secret');

    // Generate new access token
    const newToken = generateToken(decoded.id);

    res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token.'
    });
  }
};

/**
 * @desc    Revoke JWT token manually
 * @route   DELETE /jwt/revoke-token
 */
exports.jwtRevokeToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token to revoke is required.' });
    }

    // Save to blacklist
    let decoded;
    try {
      decoded = jwt.decode(token);
      if (!decoded) throw new Error();
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid JWT format.' });
    }

    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Ignore duplicate key error if already revoked
    try {
      await RevokedToken.create({ token, expiresAt });
    } catch (err) {
      // already revoked
    }

    res.status(200).json({
      success: true,
      message: 'Token successfully revoked.'
    });
  } catch (error) {
    next(error);
  }
};
