/**
 * Global Error Handling Middleware
 * Catch-all error handler that standardizes error response formats.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error to console in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Intercepted:', err);
  }

  // Mongoose bad ObjectId / CastError (e.g. GET /customers/abc)
  if (err.name === 'CastError') {
    const field = err.path || 'id';
    const message = `Invalid value for field '${field}': ${err.value}`;
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose duplicate key error (e.g. POST /customers with existing unique fields)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue).join(', ');
    const message = `Duplicate value entered for unique field(s): ${fields}`;
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join('; ');
    error = new Error(message);
    error.statusCode = 400;
  }

  const statusCode = error.statusCode || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
