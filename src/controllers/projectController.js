const { Project, Customer, ProjectBudget, ClientAdvance, ProjectMember, ProjectMilestone, Boq, Estimation, Tender, PurchaseOrder, IpcInvoice, MaterialIndent, DprLog, DprLine, VariationOrder, Grn, ScCertificate, Guarantee } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const sum = (rows, f) => rows.reduce((s, r) => s + Number(r[f] || 0), 0);

const TRANSITIONS = {
  Draft: ['Tender'],
  Tender: ['Awarded', 'Draft'],
  Awarded: ['InProgress'],
  InProgress: ['OnHold', 'Completed'],
  OnHold: ['InProgress'],
  Completed: ['HandedOver'],
  HandedOver: [],
};

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [{ code: { [Op.like]: `%${req.query.search}%` } }, { name: { [Op.like]: `%${req.query.search}%` } }, { client_name: { [Op.like]: `%${req.query.search}%` } }];
    }
    const SORTABLE = ['code', 'name', 'client_name', 'contract_value', 'status', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { rows, count } = await Project.findAndCountAll({ where, limit, offset, order: [[sortBy, sortDir]] });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const { getValue, nextNumber } = require('./settingController');
    const body = { ...req.body };
    if (!body.code) body.code = await nextNumber(orgId, 'project');
    for (const [k, dk] of [['retention_pct', 'default_retention_pct'], ['vat_pct', 'default_vat_pct'], ['advance_pct', 'default_advance_pct'], ['currency', 'default_currency'], ['billing_type', 'default_billing_type'], ['payment_terms', 'default_payment_terms']]) {
      if (body[k] === undefined || body[k] === '' || body[k] === null) {
        const v = await getValue(orgId, 'projects', dk);
        if (v !== undefined) body[k] = v;
      }
    }
    const p = await Project.create({ ...body, ...org(req), branch_id: req.branchId || req.body.branch_id || null });
    const heads = ['Material', 'Labor', 'Equipment', 'Subcontract', 'Overhead'];
    for (const head of heads) await ProjectBudget.create({ ...org(req), project_id: p.id, head, budgeted: 0 });
    return success(res, p, 'Project created', 201);
  } catch (e) { return next(e); }
};
const get = async (req, res, next) => {
  try {
    const p = await Project.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'code', 'name', 'phone', 'email', 'payment_terms'] }],
    });
    if (!p) return error(res, 'Not found', 404);
    const pid = { project_id: p.id, ...org(req) };
    const [members, budgets, milestones] = await Promise.all([
      ProjectMember.findAll({ where: pid }),
      ProjectBudget.findAll({ where: pid }),
      ProjectMilestone.findAll({ where: pid, order: [['due_date', 'ASC']] }),
    ]);
    return success(res, { ...p.toJSON(), members, budgets, milestones });
  } catch (e) { return next(e); }
};
const update = async (req, res, next) => {
  try {
    const p = await Project.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    const { status, client_id, ...rest } = req.body;
    if (client_id !== undefined) {
      if (client_id) {
        const c = await Customer.findOne({ where: { id: client_id, ...org(req) } });
        if (!c) return error(res, 'Customer not found', 404);
        rest.client_id = c.id;
        if (!rest.client_name) rest.client_name = c.name;
      } else {
        rest.client_id = null;
      }
    }
    await p.update(rest);
    return success(res, p, 'Updated');
  } catch (e) { return next(e); }
};
const transition = async (req, res, next) => {
  try {
    const p = await Project.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    const nextStatus = req.body.status;
    if (!(TRANSITIONS[p.status] || []).includes(nextStatus)) return error(res, `Cannot move from ${p.status} to ${nextStatus}`, 422);
    const patch = { status: nextStatus };
    if (nextStatus === 'InProgress' && !p.start_date) patch.start_date = new Date();
    if (nextStatus === 'Completed') patch.end_date = new Date();
    await p.update(patch);
    return success(res, p, 'Project ' + nextStatus);
  } catch (e) { return next(e); }
};
const remove = async (req, res, next) => {
  const t = await Project.sequelize.transaction();
  try {
    const where = { id: req.params.id, ...org(req) };
    const p = await Project.findOne({ where, transaction: t });
    if (!p) { await t.rollback(); return error(res, 'Not found', 404); }
    const pid = { project_id: p.id, ...org(req) };
    const checks = await Promise.all([
      Boq.count({ where: pid, transaction: t }),
      Estimation.count({ where: pid, transaction: t }),
      Tender.count({ where: pid, transaction: t }),
      PurchaseOrder.count({ where: pid, transaction: t }),
      IpcInvoice.count({ where: pid, transaction: t }),
      MaterialIndent.count({ where: pid, transaction: t }),
      DprLog.count({ where: pid, transaction: t }),
      VariationOrder.count({ where: pid, transaction: t }),
    ]);
    if (checks.some((c) => c > 0)) { await t.rollback(); return error(res, 'Cannot delete: project has transactions (BOQ/estimation/tender/PO/IPC/indent/DPR/variation)', 422); }
    await ProjectBudget.destroy({ where: pid, transaction: t });
    await ProjectMember.destroy({ where: pid, transaction: t });
    await ProjectMilestone.destroy({ where: pid, transaction: t });
    await ClientAdvance.destroy({ where: pid, transaction: t });
    await p.destroy({ transaction: t });
    await t.commit();
    return success(res, null, 'Project deleted');
  } catch (e) { await t.rollback(); return next(e); }
};
// ---- Budget ----
const saveBudget = async (req, res, next) => {
  try {
    const p = await Project.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    for (const it of (req.body.items || [])) {
      await ProjectBudget.findOrCreate({ where: { project_id: p.id, head: it.head, ...org(req) }, defaults: { ...org(req), project_id: p.id, head: it.head } })
        .then(([row]) => row.update({ budgeted: it.budgeted ?? row.budgeted, actual_manual: it.actual_manual ?? row.actual_manual, description: it.description ?? row.description }));
    }
    return success(res, await ProjectBudget.findAll({ where: { project_id: p.id, ...org(req) } }), 'Budget saved');
  } catch (e) { return next(e); }
};
const budgetVsActual = async (req, res, next) => {
  try {
    const p = await Project.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    const pid = { project_id: p.id, ...org(req) };
    const [budgets, grns, certs] = await Promise.all([
      ProjectBudget.findAll({ where: pid }),
      Grn.findAll({ where: { ...pid, status: 'Posted' } }),
      ScCertificate.findAll({ where: { ...pid, status: ['Approved', 'Paid'] } }),
    ]);
    const auto = { Material: sum(grns, 'total'), Subcontract: sum(certs, 'gross'), Labor: 0, Equipment: 0, Overhead: 0, Other: 0 };
    const rows = budgets.map((b) => {
      const actual = Number(b.actual_manual || 0) + (auto[b.head] || 0);
      return { head: b.head, description: b.description, budgeted: Number(b.budgeted || 0), actual: +actual.toFixed(2), variance: +(Number(b.budgeted || 0) - actual).toFixed(2) };
    });
    const tb = sum(rows, 'budgeted'), ta = sum(rows, 'actual');
    return success(res, { rows, total_budgeted: tb, total_actual: +ta.toFixed(2), total_variance: +(tb - ta).toFixed(2) });
  } catch (e) { return next(e); }
};
// ---- Advances ----
const listAdvances = async (req, res, next) => {
  try {
    return success(res, await ClientAdvance.findAll({ where: { project_id: req.params.id, ...org(req) }, order: [['date', 'ASC']] }));
  } catch (e) { return next(e); }
};
const createAdvance = async (req, res, next) => {
  try {
    return success(res, await ClientAdvance.create({ ...req.body, project_id: req.params.id, ...org(req) }), 'Advance recorded', 201);
  } catch (e) { return next(e); }
};
const receiveAdvance = async (req, res, next) => {
  try {
    const a = await ClientAdvance.findOne({ where: { id: req.params.advId, project_id: req.params.id, ...org(req) } });
    if (!a) return error(res, 'Not found', 404);
    await a.update({ status: a.recovered >= a.amount ? 'Closed' : (Number(a.recovered) > 0 ? 'Recovering' : 'Received') });
    return success(res, a, 'Advance ' + a.status);
  } catch (e) { return next(e); }
};
const advanceBalance = async (req, res, next) => {
  try {
    const rows = await ClientAdvance.findAll({ where: { project_id: req.params.id, ...org(req) } });
    const received = sum(rows.filter((r) => r.status !== 'Draft'), 'amount');
    return success(res, { advances: rows, total_received: received, total_recovered: sum(rows, 'recovered'), balance: +(received - sum(rows, 'recovered')).toFixed(2) });
  } catch (e) { return next(e); }
};
// ---- Members ----
const listMembers = async (req, res, next) => {
  try {
    return success(res, await ProjectMember.findAll({ where: { project_id: req.params.id, ...org(req) } }));
  } catch (e) { return next(e); }
};
const addMember = async (req, res, next) => {
  try {
    return success(res, await ProjectMember.create({ ...req.body, project_id: req.params.id, ...org(req) }), 'Member added', 201);
  } catch (e) { return next(e); }
};
const removeMember = async (req, res, next) => {
  try {
    const m = await ProjectMember.findOne({ where: { id: req.params.memberId, project_id: req.params.id, ...org(req) } });
    if (!m) return error(res, 'Not found', 404);
    await m.destroy();
    return success(res, null, 'Member removed');
  } catch (e) { return next(e); }
};
const bulkRemove = async (req, res, next) => {
  const ids = Array.isArray(req.body.ids) ? [...new Set(req.body.ids)] : [];
  if (!ids.length) return error(res, 'ids[] required', 422);
  const t = await Project.sequelize.transaction();
  try {
    let deleted = 0;
    const skipped = [];
    for (const id of ids) {
      const p = await Project.findOne({ where: { id, ...org(req) }, transaction: t });
      if (!p) { skipped.push({ id, reason: 'Not found' }); continue; }
      const pid = { project_id: p.id, ...org(req) };
      const counts = await Promise.all([
        Boq.count({ where: pid, transaction: t }),
        Estimation.count({ where: pid, transaction: t }),
        Tender.count({ where: pid, transaction: t }),
        PurchaseOrder.count({ where: pid, transaction: t }),
        IpcInvoice.count({ where: pid, transaction: t }),
        MaterialIndent.count({ where: pid, transaction: t }),
        DprLog.count({ where: pid, transaction: t }),
        VariationOrder.count({ where: pid, transaction: t }),
      ]);
      if (counts.some((c) => c > 0)) { skipped.push({ id, code: p.code, reason: 'Has transactions' }); continue; }
      await ProjectBudget.destroy({ where: pid, transaction: t });
      await ProjectMember.destroy({ where: pid, transaction: t });
      await ProjectMilestone.destroy({ where: pid, transaction: t });
      await ClientAdvance.destroy({ where: pid, transaction: t });
      await p.destroy({ transaction: t });
      deleted++;
    }
    await t.commit();
    return success(res, { deleted, skipped }, `Deleted ${deleted}, skipped ${skipped.length}`);
  } catch (e) { await t.rollback(); return next(e); }
};
const activity = async (req, res, next) => {
  try {
    const p = await Project.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    const pid = { project_id: p.id, ...org(req) };
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const [dprs, grns, certs, ipcs, vos, miles, tenders, guarantees] = await Promise.all([
      DprLog.findAll({ where: pid, include: [{ model: DprLine, as: 'lines' }], order: [['date', 'DESC']], limit }),
      Grn.findAll({ where: pid, order: [['date', 'DESC']], limit }),
      ScCertificate.findAll({ where: pid, order: [['created_at', 'DESC']], limit }),
      IpcInvoice.findAll({ where: pid, order: [['created_at', 'DESC']], limit }),
      VariationOrder.findAll({ where: pid, order: [['created_at', 'DESC']], limit }),
      ProjectMilestone.findAll({ where: pid, order: [['due_date', 'DESC']], limit }),
      Tender.findAll({ where: pid, order: [['created_at', 'DESC']], limit }),
      Guarantee.findAll({ where: pid, order: [['created_at', 'DESC']], limit }),
    ]);
    const feed = [
      ...dprs.map((d) => ({ kind: 'dpr', at: d.date, title: `DPR ${d.date} — ${d.manpower || 0} men`, ref_id: d.id, status: d.status, qty_lines: (d.lines || []).length })),
      ...grns.map((g) => ({ kind: 'grn', at: g.date || g.created_at, title: `GRN ${g.number} — ${Number(g.total || 0).toLocaleString()}`, ref_id: g.id, status: g.status })),
      ...certs.map((c) => ({ kind: 'sc_cert', at: c.created_at, title: `SC cert ${c.number} — net ${Number(c.net || 0).toLocaleString()}`, ref_id: c.id, status: c.status })),
      ...ipcs.map((x) => ({ kind: 'ipc', at: x.created_at, title: `IPC ${x.number} — net ${Number(x.net_amount || 0).toLocaleString()}`, ref_id: x.id, status: x.status })),
      ...vos.map((v) => ({ kind: 'variation', at: v.created_at, title: `VO ${v.number} — ${Number(v.amount || 0).toLocaleString()}`, ref_id: v.id, status: v.status })),
      ...miles.map((m) => ({ kind: 'milestone', at: m.due_date || m.created_at, title: `Milestone: ${m.title}`, ref_id: m.id, status: m.status })),
      ...tenders.map((x) => ({ kind: 'tender', at: x.created_at, title: `Tender ${x.number} — ${Number(x.bid_amount || 0).toLocaleString()}`, ref_id: x.id, status: x.status })),
      ...guarantees.map((g) => ({ kind: 'guarantee', at: g.created_at, title: `${g.type} guarantee ${g.number} — ${Number(g.amount || 0).toLocaleString()}`, ref_id: g.id, status: g.status })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
    const manpower7 = dprs.slice(0, 7).reduce((s, d) => s + Number(d.manpower || 0), 0);
    return success(res, { feed, last_7d_manpower_days: manpower7, counts: { dpr: dprs.length, grn: grns.length, sc_cert: certs.length, ipc: ipcs.length, variation: vos.length } });
  } catch (e) { return next(e); }
};
module.exports = { list, create, get, update, transition, remove, bulkRemove, activity, saveBudget, budgetVsActual, listAdvances, createAdvance, receiveAdvance, advanceBalance, listMembers, addMember, removeMember };
