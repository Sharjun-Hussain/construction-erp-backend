require('dotenv').config();
const db = require('../models');
// Grants all Permissions to every "Organization Admin" role that misses them.
// Run after pulling new code: npm run db:upgrade
const run = async () => {
  await db.sequelize.sync({ alter: false });
  // Column patches for existing installs (ignored if already applied)
  const qi = db.sequelize.getQueryInterface();
  const money = { type: db.Sequelize.DECIMAL(18, 2), defaultValue: 0 };
  for (const col of ['advance_recovery', 'discount']) {
    try { await qi.addColumn('ipc_invoices', col, money); console.log('added ipc_invoices.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
  const pct = { type: db.Sequelize.DECIMAL(5, 2), defaultValue: 0 };
  const str = { type: db.Sequelize.STRING, allowNull: true };
  const txt = { type: db.Sequelize.TEXT, allowNull: true };
  const projCols = [
    ['client_phone', str], ['client_email', str], ['address', txt], ['description', txt],
    ['advance_pct', pct], ['contract_no', str], ['payment_terms', str],
    ['billing_type', { type: db.Sequelize.ENUM('Monthly', 'Milestone', 'Percentage'), defaultValue: 'Monthly' }],
  ];
  for (const [col, def] of projCols) {
    try { await qi.addColumn('projects', col, def); console.log('added projects.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
  try { await qi.addColumn('users', 'last_login_at', { type: db.Sequelize.DATE, allowNull: true }); console.log('added users.last_login_at'); }
  catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  try { await qi.addColumn('projects', 'client_id', { type: db.Sequelize.UUID, allowNull: true }); console.log('added projects.client_id'); }
  catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  try { await qi.addColumn('materials', 'min_qty', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }); console.log('added materials.min_qty'); }
  catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  const itemCols = [
    ['division', { type: db.Sequelize.STRING, allowNull: true }],
    ['sort_order', { type: db.Sequelize.INTEGER, defaultValue: 0 }],
    ['cost_rate', { type: db.Sequelize.DECIMAL(18, 2), defaultValue: 0 }],
    ['billed_qty', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
  ];
  for (const [col, def] of itemCols) {
    try { await qi.addColumn('boq_items', col, def); console.log('added boq_items.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
  const PERMS = [
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
  for (const [name, group_name] of PERMS) {
    await db.Permission.findOrCreate({ where: { name }, defaults: { name, group_name } });
  }
  const perms = await db.Permission.findAll();
  const roles = await db.Role.findAll({ where: { name: 'Organization Admin' } });
  let granted = 0;
  for (const role of roles) {
    for (const p of perms) {
      const [, created] = await db.RolePermission.findOrCreate({
        where: { role_id: role.id, permission_id: p.id },
        defaults: { role_id: role.id, permission_id: p.id },
      });
      if (created) granted++;
    }
  }
  console.log(`upgrade done: ${perms.length} perms, ${roles.length} admin roles, ${granted} grants`);
};
if (require.main === module) run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
module.exports = run;
