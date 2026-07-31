const ApiError = require('../utils/ApiError');

/**
 * Catches requests to routes that don't exist and forwards a 404
 * ApiError into the centralized error handler below.
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Centralized error-handling middleware. Every controller forwards
 * errors here via next(error) instead of formatting responses inline.
 * Keeps error response shape consistent across the whole API.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : 'Internal server error';

  if (!isApiError) {
    // Unexpected/programming errors: log the full stack for debugging,
    // but never leak internal details to the client.
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const response = { success: false, message };
  if (isApiError && err.details) {
    response.errors = err.details;
  }

  res.status(statusCode).json(response);
}

module.exports = { notFoundHandler, errorHandler };
