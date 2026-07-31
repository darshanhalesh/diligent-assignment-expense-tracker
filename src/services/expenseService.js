const { v4: uuidv4 } = require('uuid');
const JsonFileHelper = require('../utils/jsonFileHelper');
const ApiError = require('../utils/ApiError');
const config = require('../config');

const expensesFile = new JsonFileHelper(config.dataFilePath);

/**
 * Creates a new expense and persists it.
 * @param {{title: string, amount: number, category: string, date: string}} payload
 * @returns {Promise<object>} the created expense
 */
async function createExpense(payload) {
  const expense = {
    id: uuidv4(),
    title: payload.title.trim(),
    amount: Number(payload.amount),
    category: payload.category.trim(),
    date: payload.date,
  };

  await expensesFile.mutate((expenses) => {
    expenses.push(expense);
    return expenses;
  });

  return expense;
}

/**
 * Returns all expenses, optionally filtered by category (case-insensitive).
 * @param {{category?: string}} filters
 */
async function getExpenses(filters = {}) {
  const expenses = await expensesFile.read();

  if (filters.category) {
    const target = filters.category.toLowerCase();
    return expenses.filter((expense) => expense.category.toLowerCase() === target);
  }

  return expenses;
}

/**
 * Builds a summary of total spend and spend broken down by category.
 * @returns {Promise<{total: number, byCategory: Record<string, number>}>}
 */
async function getSummary() {
  const expenses = await expensesFile.read();

  const summary = expenses.reduce(
    (acc, expense) => {
      acc.total += expense.amount;
      acc.byCategory[expense.category] = (acc.byCategory[expense.category] || 0) + expense.amount;
      return acc;
    },
    { total: 0, byCategory: {} }
  );

  // Round to 2 decimal places to avoid floating point artifacts (e.g. 0.1 + 0.2).
  summary.total = Math.round(summary.total * 100) / 100;
  Object.keys(summary.byCategory).forEach((category) => {
    summary.byCategory[category] = Math.round(summary.byCategory[category] * 100) / 100;
  });

  return summary;
}

/**
 * Deletes an expense by id.
 * @param {string} id
 * @throws {ApiError} 404 if no expense with that id exists
 */
async function deleteExpense(id) {
  let deleted = null;

  await expensesFile.mutate((expenses) => {
    const index = expenses.findIndex((expense) => expense.id === id);
    if (index === -1) {
      throw ApiError.notFound(`Expense with id '${id}' not found`);
    }
    deleted = expenses[index];
    expenses.splice(index, 1);
    return expenses;
  });

  return deleted;
}

module.exports = {
  createExpense,
  getExpenses,
  getSummary,
  deleteExpense,
};
