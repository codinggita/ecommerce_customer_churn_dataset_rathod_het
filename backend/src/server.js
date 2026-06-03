const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Middlewares
const logger = require('./middlewares/logger');
const requestTime = require('./middlewares/requestTime');
const { generalLimiter } = require('./middlewares/rateLimit');
const errorHandler = require('./middlewares/errorHandler');

// Route Files
const authRoutes = require('./routes/auth.routes');
const jwtRoutes = require('./routes/jwt.routes');
const customerRoutes = require('./routes/customer.routes');
const searchRoutes = require('./routes/search.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const statsRoutes = require('./routes/stats.routes');
const adminRoutes = require('./routes/admin.routes');
const middlewareRoutes = require('./routes/middleware.routes');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Standard Middlewares
app.use(cors()); // CORS support (Section 11)
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true }));

// Custom Middlewares
app.use(logger); // Logging requests (Section 10, Good to Have #2)
app.use(requestTime); // Calculating response times (Section 10, Good to Have #5)
app.use(generalLimiter); // API Rate Limiting (Section 10, Good to Have #8)

// Mount Routes
app.use('/auth', authRoutes);
app.use('/jwt', jwtRoutes);
app.use('/customers', customerRoutes);
app.use('/search/customers', searchRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/stats', statsRoutes);
app.use('/admin', adminRoutes);
app.use('/middleware', middlewareRoutes);

// Catch Unmatched Routes (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found - ${req.method} ${req.originalUrl}`
  });
});

// Centralized Global Error Handler Middleware (Section 14)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
