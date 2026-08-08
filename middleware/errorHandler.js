'use strict';

/**
 * Global Express error-handling middleware.
 * Must have exactly four parameters so Express recognises it as an error handler.
 *
 * @param {Error}           err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the full error server-side for debugging
  console.error('❌  Unhandled error:', err);

  // Turso / libSQL specific errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
    return res.status(409).json({
      success: false,
      message: 'A record with the same unique value already exists',
    });
  }

  // Generic server error
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message    || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
