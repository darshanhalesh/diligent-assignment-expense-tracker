const express = require('express');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const expenseRoutes = require('./routes/expenseRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// --- Global middleware ---
app.use(express.json());
// Handle malformed JSON bodies from express.json() early and return 400.
app.use((err, req, res, next) => {
  if ((err && err.type === 'entity.parse.failed') || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  return next(err);
});
// Skip HTTP request logging while running tests to keep test output clean.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --- Health check ---
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Smart Expense Tracker API is running' });
});

// --- API docs ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Routes ---
app.use('/api/expenses', expenseRoutes);

// --- 404 + centralized error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
