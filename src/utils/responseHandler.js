const success = (res, data = null, message = 'OK', statusCode = 200) =>
  res.status(statusCode).json({ status: 'success', message, data });
const paginated = (res, rows, total, page, limit, message = 'OK') =>
  res.status(200).json({ status: 'success', message, data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
const error = (res, message = 'Error', statusCode = 400, errors = null) =>
  res.status(statusCode).json({ status: 'error', message, errors });
module.exports = { success, paginated, error };
