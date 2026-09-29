require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const db = require('./src/models');
const mysql = require('mysql2/promise');
const routes = require('./src/routes');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const rateLimiter = require('./src/middleware/rateLimiter');

const app = express();
app.set('trust proxy', 1);

const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : [];
const alwaysAllowed = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5000', 'http://127.0.0.1:5000',
  'capacitor://localhost',
];
const allowed = [...new Set([...envOrigins, ...alwaysAllowed])];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const n = origin.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'development' || allowed.includes(n)) return cb(null, true);
    logger.warn(`[CORS] blocked: ${origin}`);
    return cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Branch-Id', 'X-Project-Id'],
}));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(rateLimiter);

app.get('/health', (req, res) => res.status(200).json({
  status: 'success', message: 'Qulf ERP running',
  timestamp: new Date().toISOString(), env: process.env.NODE_ENV,
}));

app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);
app.use((req, res) => res.status(404).json({ status: 'error', message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  const maxAttempts = parseInt(process.env.DB_RETRY_ATTEMPTS || '5', 10);
  const delay = parseInt(process.env.DB_RETRY_DELAY || '5000', 10);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`DB connect attempt ${attempt}/${maxAttempts}`);
      try {
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST || '127.0.0.1',
          port: process.env.DB_PORT || 3306,
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
        });
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'qulf_erp'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await conn.end();
      } catch (e) { logger.warn(`auto-create DB skipped: ${e.message}`); }

      if (!server) {
        server = app.listen(PORT, () => logger.info(`Qulf ERP listening on ${PORT}`));
      }
      await db.sequelize.authenticate();
      logger.info('DB connected.');

      // Dev auto-sync (use migrations in prod). Alter off to be safe.
      if (process.env.NODE_ENV !== 'production') {
        await db.sequelize.sync({ alter: false });
        logger.info('Models synced (dev).');
        const count = await db.User.count();
        if (count === 0) {
          logger.info('Fresh DB - run: npm run db:seed');
        }
      }
      logger.info('System ready.');
      return;
    } catch (err) {
      logger.error(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) { logger.error('Max DB attempts reached. Exiting.'); process.exit(1); }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

if (process.env.NODE_ENV !== 'test') startServer().catch((e) => { logger.error(e); process.exit(1); });
module.exports = app;
