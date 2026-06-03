const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    // Profile / Demographics
    age: {
      type: Number,
      required: true,
      min: 0
    },
    gender: {
      type: String,
      required: true,
      enum: ['Male', 'Female', 'Other']
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    
    // Auth fields (for users who register accounts)
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows documents without an email (seeded customers)
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      select: false // Excludes password by default in queries
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String,
      default: null
    },
    otpExpiry: {
      type: Date,
      default: null
    },

    // Engagement & Activity metrics
    membershipYears: {
      type: Number,
      required: true,
      min: 0
    },
    loginFrequency: {
      type: Number,
      required: true,
      min: 0
    },
    sessionDurationAvg: {
      type: Number,
      required: true,
      min: 0
    },
    pagesPerSession: {
      type: Number,
      required: true,
      min: 0
    },
    cartAbandonmentRate: {
      type: Number,
      required: true,
      min: 0
    },
    wishlistItems: {
      type: Number,
      required: true,
      min: 0
    },
    totalPurchases: {
      type: Number,
      required: true
    },
    averageOrderValue: {
      type: Number,
      required: true,
      min: 0
    },
    daysSinceLastPurchase: {
      type: Number,
      required: true,
      min: 0
    },
    discountUsageRate: {
      type: Number,
      required: true,
      min: 0
    },
    returnsRate: {
      type: Number,
      required: true,
      min: 0
    },
    emailOpenRate: {
      type: Number,
      required: true,
      min: 0
    },
    customerServiceCalls: {
      type: Number,
      required: true,
      min: 0
    },
    productReviewsWritten: {
      type: Number,
      required: true,
      min: 0
    },
    socialMediaEngagementScore: {
      type: Number,
      required: true,
      min: 0
    },
    mobileAppUsage: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethodDiversity: {
      type: Number,
      required: true,
      min: 0
    },
    lifetimeValue: {
      type: Number,
      required: true,
      min: 0
    },
    creditBalance: {
      type: Number,
      required: true,
      min: 0
    },
    churned: {
      type: Boolean,
      required: true,
      index: true
    },
    signupQuarter: {
      type: String,
      required: true,
      enum: ['Q1', 'Q2', 'Q3', 'Q4']
    }
  },
  {
    timestamps: true // Track createdAt and updatedAt (Good to Have Checklist item #7)
  }
);

// Indexes for query performance optimization (Checklist Section 15)
customerSchema.index({ country: 1 });
customerSchema.index({ city: 1 });
customerSchema.index({ gender: 1 });
customerSchema.index({ lifetimeValue: -1 });
customerSchema.index({ creditBalance: -1 });
customerSchema.index({ age: 1 });
customerSchema.index({ signupQuarter: 1 });

module.exports = mongoose.model('Customer', customerSchema);
