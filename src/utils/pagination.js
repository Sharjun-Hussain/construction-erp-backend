const getPagination = (req) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    parseInt(req.query.limit || process.env.DEFAULT_PAGE_SIZE || '20', 10),
    parseInt(process.env.MAX_PAGE_SIZE || '100', 10)
  );
  return { page, limit, offset: (page - 1) * limit };
};
module.exports = { getPagination };
