const { IpcInvoice, Project, ClientAdvance, Grn, ScCertificate, Boq, BoqItem, IpcItem } = require('../models');
const { success, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const calc = (gross, retentionPct, vatPct, advanceRecovery = 0, discount = 0) => {
  const g = Number(gross || 0);
  const retention = g * (Number(retentionPct || 0) / 100);
  const adv = Number(advanceRecovery || 0);
  const disc = Number(discount || 0);
  const vat = Math.max(0, g - retention - adv - disc) * (Number(vatPct || 0) / 100);
  return { retention_amount: +retention.toFixed(2), advance_recovery: adv, discount: disc, vat_amount: +vat.toFixed(2), net_amount: +(g - retention - adv - disc + vat).toFixed(2) };
};
const list = async (req, res, next) => {
  try {
    const rows = await IpcInvoice.findAll({
      where: { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}), ...(req.query.status ? { status: req.query.status } : {}) },
      include: [{ model: IpcItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });
    return success(res, rows);
  } catch (e) { return next(e); }
};
const get = async (req, res, next) => {
  try {
    const inv = await IpcInvoice.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: IpcItem, as: 'items' }] });
    if (!inv) return error(res, 'Not found', 404);
    return success(res, inv);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  const t = await IpcInvoice.sequelize.transaction();
  try {
    const { isLocked } = require('./mastersController');
    if (await isLocked(req.user.organization_id, 'ipc', req.body.invoice_date || new Date().toISOString().slice(0, 10))) { await t.rollback(); return success(res, null, 'Period is closed for IPC entries', 422); }
    const project = await Project.findOne({ where: { id: req.body.project_id, ...org(req) }, transaction: t });
    if (!project) { await t.rollback(); return success(res, null, 'Project not found', 404); }
    const { nextNumber } = require('./settingController');
    if (!req.body.number) req.body.number = await nextNumber(req.user.organization_id, 'ipc', t);
    const adv = Number(req.body.advance_recovery || 0);
    if (adv > 0) {
      const advances = await ClientAdvance.findAll({ where: { project_id: project.id, ...org(req) }, transaction: t });
      const available = advances.reduce((s, a) => s + (a.status === 'Draft' ? 0 : Number(a.amount) - Number(a.recovered)), 0);
      if (adv > available + 0.01) { await t.rollback(); return success(res, null, `Advance recovery ${adv} exceeds available ${available.toFixed(2)}`, 422); }
      let left = adv;
      for (const a of advances) {
        if (a.status === 'Draft' || left <= 0) continue;
        const avail = Number(a.amount) - Number(a.recovered);
        const take = Math.min(avail, left);
        await a.update({ recovered: +(Number(a.recovered) + take).toFixed(2), status: Number(a.recovered) + take >= Number(a.amount) - 0.01 ? 'Closed' : 'Recovering' }, { transaction: t });
        left = +(left - take).toFixed(2);
      }
    }
    const amounts = calc(req.body.gross_amount, project.retention_pct, project.vat_pct, adv, req.body.discount);
    const inv = await IpcInvoice.create({ ...req.body, ...amounts, ...org(req) }, { transaction: t });
    if (Array.isArray(req.body.items) && req.body.items.length) {
      const { BoqItem, IpcItem } = require('../models');
      let gross = 0;
      for (const ln of req.body.items) {
        const bi = await BoqItem.findOne({ where: { id: ln.boq_item_id, ...org(req) }, transaction: t });
        if (!bi) { await t.rollback(); return success(res, null, 'BOQ line not found', 404); }
        const qty = Number(ln.qty || 0);
        if (qty <= 0) continue;
        if (Number(bi.billed_qty || 0) + qty > Number(bi.quantity || 0) + 0.001) {
          await t.rollback();
          return success(res, null, `Over-billing blocked on line ${bi.line_no} (BOQ ${bi.quantity}, billed ${bi.billed_qty})`, 422);
        }
        const rate = ln.unit_rate !== undefined ? Number(ln.unit_rate) : Number(bi.unit_rate || 0);
        const amount = +(qty * rate).toFixed(2);
        await IpcItem.create({ ...org(req), ipc_id: inv.id, boq_item_id: bi.id, description: bi.description, unit: bi.unit, qty, unit_rate: rate, amount }, { transaction: t });
        await bi.update({ billed_qty: +(Number(bi.billed_qty || 0) + qty).toFixed(3) }, { transaction: t });
        gross += amount;
      }
      const re = calc(gross, project.retention_pct, project.vat_pct, adv, req.body.discount);
      await inv.update({ gross_amount: +gross.toFixed(2), ...re }, { transaction: t });
    }
    await t.commit();
    return success(res, inv, 'IPC created', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
const transition = async (req, res, next) => {
  try {
    const inv = await IpcInvoice.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!inv) return success(res, null, 'Not found', 404);
    const FLOW = { Draft: ['Submitted'], Submitted: ['Approved', 'Draft'], Approved: ['Paid'], Paid: [] };
    if (!(FLOW[inv.status] || []).includes(req.body.status)) return error(res, `Cannot move IPC from ${inv.status} to ${req.body.status}`, 422);
    await inv.update({ status: req.body.status });
    return success(res, inv, 'IPC ' + inv.status);
  } catch (e) { return next(e); }
};
const approve = transition;
const wip = async (req, res, next) => {
  try {
    const project = await Project.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!project) return error(res, 'Not found', 404);
    const pid = { project_id: project.id, ...org(req) };
    const [grns, certs, ipcs, boqs] = await Promise.all([
      Grn.findAll({ where: { ...pid, status: 'Posted' } }),
      ScCertificate.findAll({ where: { ...pid, status: ['Approved', 'Paid'] } }),
      IpcInvoice.findAll({ where: pid }),
      Boq.findAll({ where: pid }),
    ]);
    const boqIds = boqs.map((b) => b.id);
    const items = boqIds.length ? await BoqItem.findAll({ where: { boq_id: boqIds, ...org(req) } }) : [];
    const cost = grns.reduce((s, r) => s + Number(r.total || 0), 0) + certs.reduce((s, r) => s + Number(r.gross || 0), 0);
    const earned = items.reduce((s, i) => s + Number(i.progress_qty || 0) * Number(i.unit_rate || 0), 0);
    const billed = ipcs.filter((x) => x.status !== 'Draft').reduce((s, r) => s + Number(r.net_amount || 0), 0);
    return success(res, {
      project_id: project.id, contract_value: Number(project.contract_value || 0),
      cost_incurred: +cost.toFixed(2), earned_value: +earned.toFixed(2), billed: +billed.toFixed(2),
      wip_unbilled: +(earned - billed).toFixed(2),
      margin_cost_vs_earned: +(earned - cost).toFixed(2),
    });
  } catch (e) { return next(e); }
};
module.exports = { list, get, create, approve, transition, wip };
