const { Setting } = require('../models');
const { success, error } = require('../utils/responseHandler');

// Every setting here is consumed by live code (no dead config).
const DEFAULTS = {
  company: {
    name: '', name_ar: '', phone: '', email: '', address: '',
    city: 'Riyadh', commercial_registration: '', tax_number: '',
  },
  tax: { vat_pct: 15, zatca_enabled: true },
  projects: {
    default_retention_pct: 10, default_vat_pct: 15, default_advance_pct: 0,
    default_currency: 'SAR', default_billing_type: 'Monthly', default_payment_terms: 'Net 30',
  },
  numbering: {
    padding: 4,
    project: 'PRJ-', boq: 'BOQ-', estimation: 'EST-', tender: 'TEN-', ipc: 'IPC-',
    po: 'PO-', grn: 'GRN-', indent: 'IND-', quotation: 'Q-', advance: 'ADV-',
    enquiry: 'ENQ-', inspection: 'INS-', proposal: 'PROP-', job: 'JOB-',
    labour: 'LAB-', equipment: 'EQP-', eqtransfer: 'EQT-', changerequest: 'CR-',
  },
  inventory: { default_min_qty: 0 },
};
const GROUPS = Object.keys(DEFAULTS);

const all = async (orgId) => {
  const rows = await Setting.findAll({ where: { organization_id: orgId } });
  const out = JSON.parse(JSON.stringify(DEFAULTS));
  for (const r of rows) {
    if (out[r.group] && Object.prototype.hasOwnProperty.call(out[r.group], r.key)) out[r.group][r.key] = r.value;
  }
  return out;
};
const getValue = async (orgId, group, key) => {
  const row = await Setting.findOne({ where: { organization_id: orgId, group, key } });
  if (row) return row.value;
  return DEFAULTS[group] ? DEFAULTS[group][key] : undefined;
};

const get = async (req, res, next) => {
  try {
    const data = await all(req.user.organization_id);
    if (req.query.group) {
      if (!DEFAULTS[req.query.group]) return error(res, 'Unknown group', 404);
      return success(res, { [req.query.group]: data[req.query.group] });
    }
    return success(res, data);
  } catch (e) { return next(e); }
};
const update = async (req, res, next) => {
  try {
    const body = req.body || {};
    const touched = [];
    for (const group of GROUPS) {
      if (!body[group] || typeof body[group] !== 'object') continue;
      for (const [key, value] of Object.entries(body[group])) {
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS[group], key)) continue;
        await Setting.findOrCreate({
          where: { organization_id: req.user.organization_id, group, key },
          defaults: { organization_id: req.user.organization_id, group, key, value, updated_by: req.user.id },
        }).then(([row]) => row.update({ value, updated_by: req.user.id }));
        touched.push(`${group}.${key}`);
      }
    }
    if (!touched.length) return error(res, 'No valid settings provided', 422);
    return success(res, await all(req.user.organization_id), `Saved ${touched.length} setting(s)`);
  } catch (e) { return next(e); }
};
// Auto-numbering: per-org sequence stored as _seq_{prefixKey}
const nextNumber = async (orgId, prefixKey, transaction) => {
  const cfg = await all(orgId);
  const prefix = cfg.numbering[prefixKey] ?? `${String(prefixKey).toUpperCase()}-`;
  const pad = Number(cfg.numbering.padding || 4);
  const seqKey = `_seq_${prefixKey}`;
  const [row] = await Setting.findOrCreate({
    where: { organization_id: orgId, group: 'numbering', key: seqKey },
    defaults: { organization_id: orgId, group: 'numbering', key: seqKey, value: 0 },
    transaction,
  });
  const n = Number(row.value || 0) + 1;
  await row.update({ value: n }, { transaction });
  return `${prefix}${String(n).padStart(pad, '0')}`;
};

module.exports = { get, update, all, getValue, nextNumber, DEFAULTS };
