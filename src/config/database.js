const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(
  process.env.DB_NAME || 'qulf_erp',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
    define: { timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' },
    timezone: '+03:00',
  }
);
module.exports = sequelize;
