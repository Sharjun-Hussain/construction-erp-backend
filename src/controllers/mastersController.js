const { Op } = require('sequelize');
const M = require('../models');
const { success, paginated, error } = require('../utils/responseHandler');
const { getPagination } = require('../utils/pagination');

const org = (req) => ({ organization_id: req.user.organization_id });

// ================= Lookup types =================
const LOOKUP_TYPES = [
  'department', 'designation', 'warehouse', 'site',
  'delivery_method', 'delivery_term', 'payment_terms', 'charge',
  'cost_center', 'enquiry_type', 'project_type',
  'job_category', 'job_title', 'labour_type',
  'service_type', 'service_type_category',
  'expense_category', 'item_category', 'uom', 'manufacturer',
  'bank_guarantee_category', 'business_type',
];

const listLookups = async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!LOOKUP_TYPES.includes(type)) return error(res, 'Unknown lookup type', 422);
    const where = { ...org(req), type };
    if (req.query.active === '1') where.is_active = true;
    if (req.query.search) where[Op.or] = [{ code: { [Op.like]: `%${req.query.search}%` } }, { name: { [Op.like]: `%${req.query.search}%` } }];
    return success(res, await M.Lookup.findAll({ where, order: [['sort_order', 'ASC'], ['name', 'ASC']] }));
  } catch (e) { return next(e); }
};
const createLookup = async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!LOOKUP_TYPES.includes(type)) return error(res, 'Unknown lookup type', 422);
    if (!req.body.code || !req.body.name) return error(res, 'code and name required', 422);
    const r = await M.Lookup.create({ ...req.body, type, ...org(req) });
    return success(res, r, 'Added', 201);
  } catch (e) { return next(e); }
};
const updateLookup = async (req, res, next) => {
  try {
    const r = await M.Lookup.findOne({ where: { id: req.params.id, type: req.params.type, ...org(req) } });
    if (!r) return error(res, 'Not found', 404);
    await r.update(req.body);
    return success(res, r, 'Updated');
  } catch (e) { return next(e); }
};
const removeLookup = async (req, res, next) => {
  try {
    const r = await M.Lookup.findOne({ where: { id: req.params.id, type: req.params.type, ...org(req) } });
    if (!r) return error(res, 'Not found', 404);
    await r.destroy();
    return success(res, null, 'Deleted');
  } catch (e) { return next(e); }
};

// ================= Generic CRUD factory =================
const crud = (modelName, opts = {}) => {
  const unique = opts.unique || [];
  const list = async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req);
      const where = { ...org(req) };
      for (const f of (opts.filters || [])) if (req.query[f] !== undefined) where[f] = req.query[f];
      if (req.query.search && opts.searchFields) {
        where[Op.or] = opts.searchFields.map((f) => ({ [f]: { [Op.like]: `%${req.query.search}%` } }));
      }
      const { rows, count } = await M[modelName].findAndCountAll({
        where, limit, offset, order: [[opts.sortBy || 'created_at', opts.sortDir || 'DESC']], distinct: true,
        ...(opts.include ? { include: opts.include() } : {}),
      });
      return paginated(res, rows, count, page, limit);
    } catch (e) { return next(e); }
  };
  const create = async (req, res, next) => {
    try {
      for (const f of (opts.required || [])) if (req.body[f] === undefined || req.body[f] === '') return error(res, f + ' required', 422);
      if (opts.beforeCreate) await opts.beforeCreate(req);
      const r = await M[modelName].create({ ...req.body, ...org(req) });
      if (opts.afterCreate) await opts.afterCreate(req, r);
      return success(res, r, 'Created', 201);
    } catch (e) { return next(e); }
  };
  const update = async (req, res, next) => {
    try {
      const r = await M[modelName].findOne({ where: { id: req.params.id, ...org(req) } });
      if (!r) return error(res, 'Not found', 404);
      if (opts.beforeUpdate) await opts.beforeUpdate(req, r);
      await r.update(req.body);
      if (opts.afterUpdate) await opts.afterUpdate(req, r);
      return success(res, r, 'Updated');
    } catch (e) { return next(e); }
  };
  const remove = async (req, res, next) => {
    try {
      const r = await M[modelName].findOne({ where: { id: req.params.id, ...org(req) } });
      if (!r) return error(res, 'Not found', 404);
      if (opts.beforeDelete) await opts.beforeDelete(req, r);
      await r.destroy();
      return success(res, null, 'Deleted');
    } catch (e) { return next(e); }
  };
  return { list, create, update, remove };
};

const currencyRates = crud('CurrencyRate', { required: ['from_currency', 'rate', 'effective_date'], searchFields: ['from_currency', 'to_currency'], sortBy: 'effective_date', sortDir: 'DESC' });
const banks = crud('Bank', { required: ['code', 'name'], searchFields: ['code', 'name'], sortBy: 'name', sortDir: 'ASC', include: () => [{ model: M.BankAccount, as: 'accounts' }] });
const bankAccounts = crud('BankAccount', { required: ['bank_id', 'account_name', 'account_no'], searchFields: ['account_name', 'account_no', 'iban'], include: () => [{ model: M.Bank, as: 'bank', attributes: ['id', 'code', 'name'] }] });
const fiscalYears = crud('FiscalYear', { required: ['name', 'start_date', 'end_date'], sortBy: 'start_date', sortDir: 'DESC' });
const periodLocks = crud('PeriodLock', { required: ['module', 'period'], sortBy: 'period', sortDir: 'DESC', beforeCreate: async (req) => { req.body.locked_by = req.user.id; } });
const termsConditions = crud('TermsCondition', { required: ['doc_type', 'title', 'body'], filters: ['doc_type'] });
const approvalSettings = crud('ApprovalSetting', { required: ['module'] });
const vatRates = crud('VatRate', { required: ['name', 'rate'] });
const emailTemplates = crud('EmailTemplate', { required: ['code', 'name', 'subject', 'body'], searchFields: ['code', 'name'] });
const reminders = crud('Reminder', { required: ['title', 'due_date'], sortBy: 'due_date', sortDir: 'ASC' });
const customFields = crud('CustomField', { required: ['module', 'field_name'], filters: ['module'] });
const employeeRates = crud('EmployeeRate', { required: ['category'], searchFields: ['category', 'skill_level'] });

// ---- Fiscal year activation (exactly one Active) ----
const activateFiscalYear = async (req, res, next) => {
  const t = await M.FiscalYear.sequelize.transaction();
  try {
    const fy = await M.FiscalYear.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!fy) { await t.rollback(); return error(res, 'Not found', 404); }
    await M.FiscalYear.update({ status: 'Closed' }, { where: { ...org(req), status: 'Active' }, transaction: t });
    await fy.update({ status: 'Active' }, { transaction: t });
    await t.commit();
    return success(res, fy, 'Fiscal year activated');
  } catch (e) { await t.rollback(); return next(e); }
};

// ---- FX: latest rate per pair + conversion ----
const latestRates = async (req, res, next) => {
  try {
    const all = await M.CurrencyRate.findAll({ where: { ...org(req) }, order: [['effective_date', 'DESC']] });
    const seen = {};
    for (const r of all) {
      const k = `${r.from_currency}->${r.to_currency}`;
      if (!seen[k]) seen[k] = r;
    }
    return success(res, Object.values(seen));
  } catch (e) { return next(e); }
};
const convertFx = async (req, res, next) => {
  try {
    const { from, to, amount, date } = req.query;
    if (!from || !to || amount === undefined) return error(res, 'from, to and amount required', 422);
    if (from === to) return success(res, { from, to, amount: Number(amount), rate: 1, converted: Number(amount) });
    const where = { ...org(req), from_currency: from, to_currency: to };
    if (date) where.effective_date = { [Op.lte]: date };
    const r = await M.CurrencyRate.findOne({ where, order: [['effective_date', 'DESC']] });
    if (!r) return error(res, `No rate for ${from}->${to}`, 404);
    return success(res, { from, to, amount: Number(amount), rate: Number(r.rate), effective_date: r.effective_date, converted: +(Number(amount) * Number(r.rate)).toFixed(2) });
  } catch (e) { return next(e); }
};

// ---- Period-lock guard (used by DPR / IPC / PO create paths) ----
const isLocked = async (organization_id, module, dateStr) => {
  if (!dateStr) return false;
  const period = String(dateStr).slice(0, 7);
  const hit = await M.PeriodLock.findOne({ where: { organization_id, module, period } })
    || await M.PeriodLock.findOne({ where: { organization_id, module: 'all', period } });
  return !!hit;
};
const checkLock = async (req, res, next) => {
  try {
    const { module, date } = req.query;
    if (!module || !date) return error(res, 'module and date required', 422);
    return success(res, { module, date, locked: await isLocked(req.user.organization_id, module, date) });
  } catch (e) { return next(e); }
};

// ---- Approvals inbox: everything awaiting a decision ----
const approvalsInbox = async (req, res, next) => {
  try {
    const o = org(req);
    const q = { limit: 200 };
    const pick = (rows, kind, titleOf, subOf, linkOf) => (rows || []).map((r) => ({
      kind, id: r.id, title: titleOf(r), sub: subOf(r), link: linkOf(r),
      amount: Number(r.bid_amount ?? r.total_amount ?? r.sell_total ?? r.gross_amount ?? r.net_amount ?? r.amount ?? r.gross ?? r.cost_impact ?? 0),
      status: r.status, date: r.created_at,
    }));
    const [tenders, boqs, ests, ipcs, vos, crs, props, dprs] = await Promise.all([
      M.Tender.findAll({ where: { ...o, status: 'Submitted' }, ...q, include: [{ model: M.Project, as: 'project', attributes: ['code'] }] }),
      M.Boq.findAll({ where: { ...o, status: 'Submitted' }, ...q }),
      M.Estimation.findAll({ where: { ...o, status: 'Submitted' }, ...q }),
      M.IpcInvoice.findAll({ where: { ...o, status: 'Submitted' }, ...q }),
      M.VariationOrder.findAll({ where: { ...o, status: 'Submitted' }, ...q }),
      M.ChangeRequest.findAll({ where: { ...o, status: 'UnderReview' }, ...q }),
      M.Proposal.findAll({ where: { ...o, status: 'Sent' }, ...q }),
      M.DprLog.findAll({ where: { ...o, status: 'Submitted' }, ...q }),
    ]);
    const items = [
      ...pick(tenders, 'Tender', (r) => `${r.number} — ${r.title || ''}`, (r) => r.project?.code || '', (r) => `/tenders/${r.id}`),
      ...pick(boqs, 'BOQ', (r) => `${r.number} R${r.revision}`, (r) => r.title || '', (r) => `/boqs/${r.id}`),
      ...pick(ests, 'Estimation', (r) => `${r.number} R${r.revision}`, (r) => '', (r) => `/estimations/${r.id}`),
      ...pick(ipcs, 'IPC', (r) => r.number, (r) => '', (r) => `/ipc`),
      ...pick(vos, 'Variation', (r) => r.number, (r) => String(r.description || '').slice(0, 60), (r) => `/changes`),
      ...pick(crs, 'Change Req.', (r) => `${r.number} — ${r.title}`, (r) => r.origin || '', (r) => `/changes`),
      ...pick(props, 'Proposal', (r) => `${r.number} R${r.revision}`, (r) => r.title || '', (r) => `/proposals/${r.id}`),
      ...pick(dprs, 'DPR', (r) => String(r.date || ''), (r) => r.notes || '', (r) => `/site`),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    const byKind = {};
    for (const i of items) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
    return success(res, { total: items.length, by_kind: byKind, items });
  } catch (e) { return next(e); }
};

// ---- Import / Export: CSV for lookups + key masters ----
const EXPORTABLE = {
  lookups: () => M.Lookup, customers: () => M.Customer, materials: () => M.Material,
  suppliers: () => M.Supplier, subcontractors: () => M.Subcontractor, equipment: () => M.Equipment,
  projects: () => M.Project, banks: () => M.Bank, employee_rates: () => M.EmployeeRate,
};
const exportCsv = async (req, res, next) => {
  try {
    const fn = EXPORTABLE[req.params.entity];
    if (!fn) return error(res, 'Unknown entity', 422);
    const rows = await fn().findAll({ where: { ...org(req) }, order: [['created_at', 'DESC']], limit: 5000 });
    const data = rows.map((r) => r.toJSON());
    const cols = [...new Set(data.flatMap((d) => Object.keys(d)))].filter((c) => !['organization_id'].includes(c));
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(','), ...data.map((d) => cols.map((c) => esc(d[c])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.entity}.csv"`);
    return res.send(csv);
  } catch (e) { return next(e); }
};
const importLookups = async (req, res, next) => {
  try {
    const { type, rows } = req.body;
    if (!LOOKUP_TYPES.includes(type)) return error(res, 'Unknown lookup type', 422);
    if (!Array.isArray(rows) || !rows.length) return error(res, 'rows[] required', 422);
    let created = 0, skipped = 0;
    for (const r of rows.slice(0, 1000)) {
      if (!r.code || !r.name) { skipped++; continue; }
      const [, isNew] = await M.Lookup.findOrCreate({
        where: { organization_id: req.user.organization_id, type, code: String(r.code) },
        defaults: { organization_id: req.user.organization_id, type, code: String(r.code), name: String(r.name), name_ar: r.name_ar || null, description: r.description || null },
      });
      if (isNew) created++; else skipped++;
    }
    return success(res, { created, skipped }, `Imported ${created}, skipped ${skipped}`);
  } catch (e) { return next(e); }
};

module.exports = {
  LOOKUP_TYPES,
  listLookups, createLookup, updateLookup, removeLookup,
  currencyRates, banks, bankAccounts, fiscalYears, periodLocks, termsConditions,
  approvalSettings, vatRates, emailTemplates, reminders, customFields, employeeRates,
  activateFiscalYear, latestRates, convertFx, isLocked, checkLock,
  approvalsInbox, exportCsv, importLookups,
};
