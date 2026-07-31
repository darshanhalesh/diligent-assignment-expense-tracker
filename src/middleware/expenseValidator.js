const { body, query, param, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after the express-validator chains below and turns any
 * validation failures into a single 400 ApiError with a readable
 * list of field-level messages.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  return next();
}

const createExpenseRules = [
  body('title')
    .exists({ checkFalsy: true })
    .withMessage('title is required')
    .bail()
    .isString()
    .withMessage('title must be a string')
    .bail()
    .trim()
    .isLength({ min: 1 })
    .withMessage('title cannot be empty'),

  body('amount')
    .exists()
    .withMessage('amount is required')
    .bail()
    .isFloat({ gt: 0 })
    .withMessage('amount must be a number greater than 0'),

  body('category')
    .exists({ checkFalsy: true })
    .withMessage('category is required')
    .bail()
    .isString()
    .withMessage('category must be a string')
    .bail()
    .trim()
    .isLength({ min: 1 })
    .withMessage('category cannot be empty'),

  body('date')
    .exists({ checkFalsy: true })
    .withMessage('date is required')
    .bail()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date (e.g. 2026-07-30)'),

  handleValidationErrors,
];

const getExpensesRules = [
  query('category').optional().isString().trim().isLength({ min: 1 }).withMessage('category must not be empty'),
  handleValidationErrors,
];

const expenseIdRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  handleValidationErrors,
];

module.exports = {
  createExpenseRules,
  getExpensesRules,
  expenseIdRules,
};
