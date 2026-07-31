/**
 * Custom error class for predictable, operational errors (bad input,
 * missing resource, etc). Lets the centralized error middleware tell
 * these apart from unexpected programming errors and respond with the
 * right HTTP status code instead of a generic 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, details);
  }

  static notFound(message) {
    return new ApiError(404, message);
  }
}

module.exports = ApiError;
