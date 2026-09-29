require('dotenv').config();
const db = require('../models');
// Grants all Permissions to every "Organization Admin" role that misses them.
// Run after pulling new code: npm run db:upgrade
const run = async () => {
  try { await db.sequelize.sync({ alter: false }); } catch (e) { console.warn('sync skipped:', e.message); }
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
  const matCols = [
    ['name_ar', str], ['category', str], ['manufacturer', str], ['manufacturer_part_no', str],
    ['model_no', str], ['suffix', str], ['description_ar', txt],
    ['vat_rate_id', { type: db.Sequelize.UUID, allowNull: true }],
    ['inventory_account', { type: db.Sequelize.STRING, defaultValue: 'Inventory Asset' }],
    ['income_account', { type: db.Sequelize.STRING, defaultValue: 'Sales of Product Income' }],
    ['expense_account', { type: db.Sequelize.STRING, defaultValue: 'Cost Of Sales' }],
    ['preferred_supplier_id', { type: db.Sequelize.UUID, allowNull: true }],
    ['department', str],
    ['purchase_unit', str], ['barcode', str], ['brand', str], ['country_of_origin', str],
    ['lead_time_unit', { type: db.Sequelize.STRING, defaultValue: 'Days' }],
    ['is_service', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
    ['is_taxable', { type: db.Sequelize.BOOLEAN, defaultValue: true }],
    ['is_sellable', { type: db.Sequelize.BOOLEAN, defaultValue: true }],
    ['is_purchasable', { type: db.Sequelize.BOOLEAN, defaultValue: true }],
    ['has_tolerance', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
    ['batch_tracking', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
    ['serial_tracking', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
    ['expiry_tracking', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
    ['discount_pct', pct], ['tolerance_pct', pct],
    ['conversion_factor', { type: db.Sequelize.DECIMAL(18, 4), defaultValue: 1 }],
    ['weight_kg', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
    ['length_m', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
    ['width_m', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
    ['height_m', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
    ['max_qty', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
    ['reorder_qty', { type: db.Sequelize.DECIMAL(18, 3), defaultValue: 0 }],
    ['purchase_price', money], ['sell_price', money],
    ['lead_time_days', { type: db.Sequelize.INTEGER, defaultValue: 0 }],
    ['shelf_life_days', { type: db.Sequelize.INTEGER, defaultValue: 0 }],
  ];
  for (const [col, def] of matCols) {
    try { await qi.addColumn('materials', col, def); console.log('added materials.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
  const bool = { type: db.Sequelize.BOOLEAN, defaultValue: false };
  const dateOnly = { type: db.Sequelize.DATEONLY, allowNull: true };
  const uuid = { type: db.Sequelize.UUID, allowNull: true };
  const estCols = [
    ['subcontract_cost', money],
    ['contingency_pct', pct], ['escalation_pct', pct],
    ['date', dateOnly], ['enquiry_id', uuid], ['enquiry_no', str],
    ['reference', str], ['site', str],
    ['bid_expiry_date', dateOnly], ['expected_start_date', dateOnly], ['expected_end_date', dateOnly],
    ['salesman', str], ['similar_projects', str],
    ['customer_name', str], ['customer_address', txt],
    ['contact_person', str], ['contact_phone', str], ['contact_email', str],
    ['project_type', str], ['service', str], ['project_name_ar', str],
    ['extension_no', str], ['parent_project_id', uuid], ['scope_of_work', txt],
    ['auto_generate_job_no', { type: db.Sequelize.BOOLEAN, defaultValue: true }],
    ['copy_attachment_enquiry', bool], ['copy_attachment_site_inspection', bool],
    ['estimate_without_resource', bool], ['default_material_cost_pricelist', bool],
  ];
  for (const [col, def] of estCols) {
    try { await qi.addColumn('estimations', col, def); console.log('added estimations.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
  const estItemCols = [
    ['division', str], ['sort_order', { type: db.Sequelize.INTEGER, defaultValue: 0 }],
    ['resource_type', { type: db.Sequelize.ENUM('Material', 'Labor', 'Equipment', 'Subcontract', 'Mixed'), defaultValue: 'Mixed' }],
  ];
  for (const [col, def] of estItemCols) {
    try { await qi.addColumn('estimation_items', col, def); console.log('added estimation_items.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
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
  const tenderCols = [
    ['reference', str], ['title', str], ['client_id', { type: db.Sequelize.UUID, allowNull: true }],
    ['client_name', str], ['consultant_name', str],
    ['tender_type', { type: db.Sequelize.ENUM('Open', 'Selective', 'Limited', 'Negotiated'), defaultValue: 'Open' }],
    ['contract_type', { type: db.Sequelize.ENUM('LumpSum', 'UnitRate', 'CostPlus', 'GMP'), defaultValue: 'LumpSum' }],
    ['currency', { type: db.Sequelize.STRING(3), defaultValue: 'SAR' }],
    ['issue_date', { type: db.Sequelize.DATEONLY, allowNull: true }],
    ['submission_deadline', { type: db.Sequelize.DATEONLY, allowNull: true }],
    ['validity_date', { type: db.Sequelize.DATEONLY, allowNull: true }],
    ['cost_amount', money], ['margin_pct', pct], ['contingency_pct', pct], ['escalation_pct', pct],
    ['bond_type', str], ['bond_amount', money], ['bond_expiry', { type: db.Sequelize.DATEONLY, allowNull: true }],
    ['bond_ref', str], ['bond_status', { type: db.Sequelize.ENUM('None', 'Pending', 'Issued', 'Released', 'Forfeited'), defaultValue: 'None' }],
    ['scope', txt], ['baseline_frozen_at', { type: db.Sequelize.DATE, allowNull: true }],
    ['awarded_at', { type: db.Sequelize.DATE, allowNull: true }],
    ['awarded_project_id', { type: db.Sequelize.UUID, allowNull: true }],
    ['reason_lost', str], ['probability', { type: db.Sequelize.INTEGER, defaultValue: 0 }], ['notes', txt],
  ];
  for (const [col, def] of tenderCols) {
    try { await qi.addColumn('tenders', col, def); console.log('added tenders.' + col); }
    catch (e) { if (!/duplicate/i.test(e.message)) throw e; }
  }
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
  // Seed default lookups for every org (idempotent)
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
    const [, vatNew] = await db.VatRate.findOrCreate({
      where: { organization_id: o.id, name: 'Standard 15%' },
      defaults: { organization_id: o.id, name: 'Standard 15%', rate: 15, is_default: true },
    });
    if (vatNew) seeded++;
    const [, vatZero] = await db.VatRate.findOrCreate({
      where: { organization_id: o.id, name: 'Zero Rated' },
      defaults: { organization_id: o.id, name: 'Zero Rated', rate: 0 },
    });
    if (vatZero) seeded++;
  }
  console.log(`seeded ${seeded} default lookups/vat rates`);
};
if (require.main === module) run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
module.exports = run;
