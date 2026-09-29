const logger = require('../utils/logger');
class AppError extends Error {
  constructor(message, statusCode = 400) { super(message); this.statusCode = statusCode; this.isOperational = true; }
}
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  logger.error(err.message);
  if (err.name === 'SequelizeUniqueConstraintError')
    return res.status(409).json({ status: 'error', message: 'Duplicate record', errors: err.errors?.map((e) => e.message) });
  if (err.name === 'SequelizeValidationError')
    return res.status(422).json({ status: 'error', message: 'Validation failed', errors: err.errors?.map((e) => e.message) });
  const code = err.statusCode || 500;
  return res.status(code).json({ status: 'error', message: err.isOperational ? err.message : 'Internal server error' });
};
module.exports = errorHandler;
module.exports.AppError = AppError;
