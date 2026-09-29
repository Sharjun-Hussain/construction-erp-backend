require('dotenv').config();
const { sequelize, Warehouse } = require('./src/models');

async function sync() {
  console.log('Authenticating database...');
  await sequelize.authenticate();
  console.log('Syncing Warehouse model...');
  await Warehouse.sync({ alter: true });
  console.log('Table warehouses synchronized successfully!');
  process.exit(0);
}

sync().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
