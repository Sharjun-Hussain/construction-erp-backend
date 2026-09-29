require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');
const run = async () => {
  await db.sequelize.sync({ alter: false });
  const perms = [
    ['project:view', 'Projects'], ['project:create', 'Projects'], ['project:edit', 'Projects'],
    ['boq:view', 'BOQ'], ['boq:create', 'BOQ'], ['boq:edit', 'BOQ'], ['boq:approve', 'BOQ'],
    ['estimation:view', 'Estimation'], ['estimation:create', 'Estimation'], ['estimation:edit', 'Estimation'], ['estimation:approve', 'Estimation'],
    ['tender:view', 'Tender'], ['tender:create', 'Tender'],
    ['ipc:view', 'IPC'], ['ipc:create', 'IPC'],
    ['procurement:view', 'Procurement'], ['procurement:create', 'Procurement'], ['procurement:approve', 'Procurement'],
    ['subcontract:view', 'Subcontract'], ['subcontract:create', 'Subcontract'], ['subcontract:approve', 'Subcontract'],
    ['site:view', 'Site'], ['site:create', 'Site'], ['site:approve', 'Site'],
    ['document:view', 'Documents'], ['document:create', 'Documents'],
    ['customer:view', 'Customers'], ['customer:create', 'Customers'], ['customer:edit', 'Customers'], ['customer:delete', 'Customers'],
    ['user:view', 'Admin'], ['role:view', 'Admin'],
    ['user:create', 'Admin'], ['user:edit', 'Admin'], ['user:delete', 'Admin'],
    ['role:create', 'Admin'], ['role:edit', 'Admin'], ['role:delete', 'Admin'],
    ['setting:view', 'Admin'], ['setting:edit', 'Admin'],
  ];
  for (const [name, group_name] of perms) {
    await db.Permission.findOrCreate({ where: { name }, defaults: { name, group_name } });
  }
  const [org] = await db.Organization.findOrCreate({
    where: { name: 'Qulf Demo Contracting' },
    defaults: { name: 'Qulf Demo Contracting', city: 'Riyadh', country: 'SA', currency: 'SAR' },
  });
  const [branch] = await db.Branch.findOrCreate({
    where: { organization_id: org.id, name: 'Head Office' },
    defaults: { organization_id: org.id, name: 'Head Office', is_main: true },
  });
  const hash = await bcrypt.hash('Admin@123', 10);
  const [admin] = await db.User.findOrCreate({
    where: { organization_id: org.id, email: 'admin@qulf.sa' },
    defaults: { organization_id: org.id, branch_id: branch.id, name: 'Admin', email: 'admin@qulf.sa', password_hash: hash },
  });
  const [role] = await db.Role.findOrCreate({ where: { organization_id: org.id, name: 'Organization Admin' }, defaults: { organization_id: org.id, name: 'Organization Admin', is_system: true } });
  const allPerms = await db.Permission.findAll();
  for (const p of allPerms) {
    await db.RolePermission.findOrCreate({ where: { role_id: role.id, permission_id: p.id }, defaults: { role_id: role.id, permission_id: p.id } });
  }
  await db.UserRole.findOrCreate({ where: { user_id: admin.id, role_id: role.id }, defaults: { user_id: admin.id, role_id: role.id } });
  console.log('seeded: admin@qulf.sa / Admin@123');
};
if (require.main === module) run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
module.exports = run;
