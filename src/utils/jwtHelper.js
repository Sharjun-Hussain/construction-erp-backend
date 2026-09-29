const jwt = require('jsonwebtoken');
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
const verifyToken = (token, isRefresh = false) =>
  jwt.verify(token, isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET);
module.exports = { generateAccessToken, generateRefreshToken, verifyToken };
