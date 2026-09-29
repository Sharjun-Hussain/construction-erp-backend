require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qulf_erp',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: process.env.DB_DIALECT || 'mysql',
  timezone: '+03:00',
  define: { timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' },
};

module.exports = {
  development: { ...base },
  test: { ...base, database: `${base.database}_test` },
  production: { ...base },
};
