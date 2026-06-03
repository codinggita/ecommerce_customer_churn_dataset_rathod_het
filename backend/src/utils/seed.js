const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Customer = require('../models/customer.model');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/customer_churn';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for database seeding.');

    const dataPath = path.join(__dirname, '../customer-churn-data.json');
    if (!fs.existsSync(dataPath)) {
      console.error(`Error: Dataset file not found at ${dataPath}`);
      process.exit(1);
    }

    console.log('Reading JSON dataset...');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Successfully parsed ${rawData.length} records from JSON.`);

    console.log('Mapping keys and parsing field types to database format...');
    const parsedRecords = rawData.map((item, idx) => {
      const parseNum = (val, defaultValue = 0) => {
        if (val === undefined || val === null || val === '') return defaultValue;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      return {
        age: parseNum(item.Age, 35),
        gender: item.Gender || 'Other',
        country: item.Country || 'Unknown',
        city: item.City || 'Unknown',
        membershipYears: parseNum(item.Membership_Years, 0),
        loginFrequency: parseNum(item.Login_Frequency, 0),
        sessionDurationAvg: parseNum(item.Session_Duration_Avg, 0),
        pagesPerSession: parseNum(item.Pages_Per_Session, 0),
        cartAbandonmentRate: parseNum(item.Cart_Abandonment_Rate, 0),
        wishlistItems: parseNum(item.Wishlist_Items, 0),
        totalPurchases: parseNum(item.Total_Purchases, 0),
        averageOrderValue: parseNum(item.Average_Order_Value, 0),
        daysSinceLastPurchase: parseNum(item.Days_Since_Last_Purchase, 0),
        discountUsageRate: parseNum(item.Discount_Usage_Rate, 0),
        returnsRate: parseNum(item.Returns_Rate, 0),
        emailOpenRate: parseNum(item.Email_Open_Rate, 0),
        customerServiceCalls: parseNum(item.Customer_Service_Calls, 0),
        productReviewsWritten: parseNum(item.Product_Reviews_Written, 0),
        socialMediaEngagementScore: parseNum(item.Social_Media_Engagement_Score, 0),
        mobileAppUsage: parseNum(item.Mobile_App_Usage, 0),
        paymentMethodDiversity: parseNum(item.Payment_Method_Diversity, 0),
        lifetimeValue: parseNum(item.Lifetime_Value, 0),
        creditBalance: parseNum(item.Credit_Balance, 0),
        // Churned should be mapped to Boolean
        churned: item.Churned === '1' || item.Churned === 1 || String(item.Churned).toLowerCase() === 'true',
        signupQuarter: item.Signup_Quarter || 'Q1'
      };
    });

    console.log('Clearing existing customer collections...');
    await Customer.deleteMany({});

    console.log('Inserting parsed records in batches...');
    const batchSize = 2000;
    for (let i = 0; i < parsedRecords.length; i += batchSize) {
      const batch = parsedRecords.slice(i, i + batchSize);
      await Customer.insertMany(batch);
      console.log(`Inserted batch ${i / batchSize + 1} (${i + 1} to ${Math.min(i + batchSize, parsedRecords.length)})...`);
    }

    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during database seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
