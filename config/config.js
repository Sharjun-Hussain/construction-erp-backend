require('dotenv').config();
module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'qulf_erp',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    timezone: '+03:00',
    define: { underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' },
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: `${process.env.DB_NAME || 'qulf_erp'}_test`,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '+03:00',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  },
};
