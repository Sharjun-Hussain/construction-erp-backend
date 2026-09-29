require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');

// Canonical permission catalogue. Add new permissions here — db:seed grants
// any missing ones to every Organization Admin role (idempotent).
const PERMS = [
  ['project:view', 'Projects'], ['project:create', 'Projects'], ['project:edit', 'Projects'],
  ['boq:view', 'BOQ'], ['boq:create', 'BOQ'], ['boq:edit', 'BOQ'], ['boq:approve', 'BOQ'],
  ['estimation:view', 'Estimation'], ['estimation:create', 'Estimation'], ['estimation:edit', 'Estimation'], ['estimation:approve', 'Estimation'],
  ['tender:view', 'Tender'], ['tender:create', 'Tender'], ['tender:delete', 'Tender'], ['tender:edit', 'Tender'],
  ['enquiry:view', 'PreBid'], ['enquiry:create', 'PreBid'],
  ['inspection:view', 'PreBid'], ['inspection:create', 'PreBid'],
  ['proposal:view', 'PreBid'], ['proposal:create', 'PreBid'],
  ['labour:view', 'SiteOps'], ['labour:create', 'SiteOps'],
  ['equipment:view', 'SiteOps'], ['equipment:create', 'SiteOps'],
  ['job:view', 'SiteOps'], ['job:create', 'SiteOps'],
  ['changerequest:view', 'Changes'], ['changerequest:create', 'Changes'],
  ['master:view', 'Masters'], ['master:create', 'Masters'], ['master:delete', 'Masters'],
  ['ipc:view', 'IPC'], ['ipc:create', 'IPC'],
  ['procurement:view', 'Procurement'], ['procurement:create', 'Procurement'],
  ['procurement:approve', 'Procurement'], ['procurement:delete', 'Procurement'],
  ['subcontract:view', 'Subcontract'], ['subcontract:create', 'Subcontract'], ['subcontract:approve', 'Subcontract'],
  ['site:view', 'Site'], ['site:create', 'Site'], ['site:approve', 'Site'],
  ['document:view', 'Documents'], ['document:create', 'Documents'],
  ['customer:view', 'Customers'], ['customer:create', 'Customers'], ['customer:edit', 'Customers'], ['customer:delete', 'Customers'],
  ['user:view', 'Admin'], ['role:view', 'Admin'],
  ['user:create', 'Admin'], ['user:edit', 'Admin'], ['user:delete', 'Admin'],
  ['role:create', 'Admin'], ['role:edit', 'Admin'], ['role:delete', 'Admin'],
  ['setting:view', 'Admin'], ['setting:edit', 'Admin'],
];

// Default lookup values seeded per organization (idempotent).
const DEFAULT_LOOKUPS = {
  uom: [['NOS', 'Numbers'], ['M', 'Meter'], ['M2', 'Sq. Meter'], ['M3', 'Cu. Meter'], ['KG', 'Kilogram'], ['TON', 'Ton'], ['LTR', 'Litre'], ['LS', 'Lump Sum'], ['DAY', 'Day'], ['HR', 'Hour'], ['SET', 'Set'], ['BAG', 'Bag']],
  payment_terms: [['NET30', 'Net 30'], ['NET60', 'Net 60'], ['NET90', 'Net 90'], ['ADV100', '100% Advance'], ['CAD', 'Cash Against Documents']],
  delivery_method: [['SITE', 'Site Delivery'], ['PICKUP', 'Customer Pickup'], ['COURIER', 'Courier'], ['FREIGHT', 'Freight']],
  cost_center: [['HO', 'Head Office'], ['SITE', 'Site Operations'], ['STORE', 'Store'], ['WORKSHOP', 'Workshop']],
  business_type: [['GEN', 'General Contracting'], ['MECH', 'Mechanical'], ['ELEC', 'Electrical'], ['CIVIL', 'Civil'], ['TRADING', 'Trading']],
  enquiry_type: [['NEW', 'New Project'], ['MAINT', 'Maintenance'], ['REPEAT', 'Repeat Client'], ['AMC', 'Annual Contract']],
  project_type: [['BLDG', 'Building'], ['INFRA', 'Infrastructure'], ['INDUST', 'Industrial'], ['INTERIOR', 'Interior'], ['MAINT', 'Maintenance']],
  labour_type: [['MASON', 'Mason'], ['STEEL', 'Steel Fixer'], ['CARP', 'Carpenter'], ['ELEC', 'Electrician'], ['PLUMB', 'Plumber'], ['HELPER', 'Helper'], ['FOREMAN', 'Foreman']],
  expense_category: [['FUEL', 'Fuel'], ['TRAVEL', 'Travel'], ['FOOD', 'Food & Accommodation'], ['RENT', 'Rent'], ['UTIL', 'Utilities'], ['MAINT', 'Maintenance']],
  item_category: [['MAT', 'Materials'], ['CONS', 'Consumables'], ['TOOL', 'Tools'], ['SPARE', 'Spares'], ['SAFETY', 'Safety']],
  bank_guarantee_category: [['BID', 'Bid Bond'], ['PERF', 'Performance Guarantee'], ['ADV', 'Advance Guarantee'], ['RET', 'Retention Guarantee']],
};

const run = async () => {
  // Schema is owned by migrations — never sync here.
  try {
    await db.Permission.describe();
  } catch (e) {
    throw new Error('Database is not migrated. Run: npm run db:migrate');
  }

  for (const [name, group_name] of PERMS) {
    await db.Permission.findOrCreate({ where: { name }, defaults: { name, group_name } });
  }
  const perms = await db.Permission.findAll();

  // Demo org + admin (only created once; safe to re-run).
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
  const [role] = await db.Role.findOrCreate({
    where: { organization_id: org.id, name: 'Organization Admin' },
    defaults: { organization_id: org.id, name: 'Organization Admin', is_system: true },
  });
  await db.UserRole.findOrCreate({ where: { user_id: admin.id, role_id: role.id }, defaults: { user_id: admin.id, role_id: role.id } });

  // Grant every permission to every Organization Admin role (all orgs).
  const adminRoles = await db.Role.findAll({ where: { name: 'Organization Admin' } });
  let granted = 0;
  for (const r of adminRoles) {
    for (const p of perms) {
      const [, created] = await db.RolePermission.findOrCreate({
        where: { role_id: r.id, permission_id: p.id },
        defaults: { role_id: r.id, permission_id: p.id },
      });
      if (created) granted++;
    }
  }

  // Default lookups + VAT rates per organization.
  const orgs = await db.Organization.findAll({ attributes: ['id'] });
  let seeded = 0;
  for (const o of orgs) {
    for (const [type, items] of Object.entries(DEFAULT_LOOKUPS)) {
      for (const [code, name] of items) {
        const [, isNew] = await db.Lookup.findOrCreate({
          where: { organization_id: o.id, type, code },
          defaults: { organization_id: o.id, type, code, name },
        });
        if (isNew) seeded++;
      }
    }
    for (const [name, rate, isDefault] of [['Standard 15%', 15, true], ['Zero Rated', 0, false]]) {
      const [, isNew] = await db.VatRate.findOrCreate({
        where: { organization_id: o.id, name },
        defaults: { organization_id: o.id, name, rate, is_default: isDefault },
      });
      if (isNew) seeded++;
    }
  }

  console.log(`seeded: ${perms.length} perms, ${adminRoles.length} admin roles (${granted} new grants), ${seeded} lookups/vat, admin admin@qulf.sa`);
};
if (require.main === module) run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
module.exports = run;
