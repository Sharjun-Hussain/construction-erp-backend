const { RateLimiterMemory } = require('rate-limiter-flexible');
const limiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) / 1000,
});
module.exports = async (req, res, next) => {
  try { await limiter.consume(req.ip); return next(); }
  catch { return res.status(429).json({ status: 'error', message: 'Too many requests' }); }
};
