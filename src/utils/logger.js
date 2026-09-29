const winston = require('winston');
require('winston-daily-rotate-file');
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) }),
  ],
});
logger.stream = { write: (msg) => logger.info(msg.trim()) };
module.exports = logger;
