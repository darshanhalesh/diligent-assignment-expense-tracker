const express = require('express');
const expenseController = require('../controllers/expenseController');
const {
  createExpenseRules,
  getExpensesRules,
  expenseIdRules,
} = require('../middleware/expenseValidator');

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Expense:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           example: Groceries
 *         amount:
 *           type: number
 *           example: 250.75
 *         category:
 *           type: string
 *           example: Food
 *         date:
 *           type: string
 *           format: date
 *           example: 2026-07-30
 *     NewExpense:
 *       type: object
 *       required: [title, amount, category, date]
 *       properties:
 *         title:
 *           type: string
 *           example: Groceries
 *         amount:
 *           type: number
 *           example: 250.75
 *         category:
 *           type: string
 *           example: Food
 *         date:
 *           type: string
 *           format: date
 *           example: 2026-07-30
 */

/**
 * @openapi
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewExpense'
 *     responses:
 *       201:
 *         description: Expense created
 *       400:
 *         description: Validation error
 */
router.post('/', createExpenseRules, expenseController.createExpense);

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     summary: Get all expenses, optionally filtered by category
 *     tags: [Expenses]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter expenses by category (case-insensitive)
 *     responses:
 *       200:
 *         description: List of expenses
 */
router.get('/', getExpensesRules, expenseController.getExpenses);

/**
 * @openapi
 * /api/expenses/summary:
 *   get:
 *     summary: Get total spend and spend broken down by category
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Expense summary
 */
// IMPORTANT: this must be registered before the "/:id"-style routes so
// the literal path "summary" isn't ever swallowed by a param matcher.
router.get('/summary', expenseController.getSummary);

/**
 * @openapi
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense by id
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Expense deleted
 *       404:
 *         description: Expense not found
 */
router.delete('/:id', expenseIdRules, expenseController.deleteExpense);

module.exports = router;
