require('dotenv').config();
const { sequelize, Project, Job } = require('./src/models');

async function sync() {
  console.log('Authenticating database...');
  await sequelize.authenticate();
  console.log('Syncing upgraded Project and Job models...');
  await Project.sync({ alter: true });
  await Job.sync({ alter: true });
  console.log('Tables projects and jobs synchronized successfully!');
  process.exit(0);
}

sync().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
