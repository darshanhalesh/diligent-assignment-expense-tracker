const expenseService = require('../services/expenseService');

/**
 * POST /api/expenses
 * Controllers stay thin: validate (done in middleware), delegate to the
 * service, shape the HTTP response. No business logic lives here.
 */
async function createExpense(req, res, next) {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses
 * GET /api/expenses?category=Food
 */
async function getExpenses(req, res, next) {
  try {
    const { category } = req.query;
    const expenses = await expenseService.getExpenses({ category });
    res.status(200).json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/expenses/summary
 */
async function getSummary(req, res, next) {
  try {
    const summary = await expenseService.getSummary();
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/expenses/:id
 */
async function deleteExpense(req, res, next) {
  try {
    const deleted = await expenseService.deleteExpense(req.params.id);
    res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createExpense,
  getExpenses,
  getSummary,
  deleteExpense,
};
