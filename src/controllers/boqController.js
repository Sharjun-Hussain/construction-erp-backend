const XLSX = require('xlsx');
const { Boq, BoqItem, BoqHistory, BoqTemplate, BoqTemplateItem, Project, IpcInvoice, IpcItem } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const hist = (req, boqId, action, detail, t) =>
  BoqHistory.create({ ...org(req), boq_id: boqId, action, detail: detail || null, user_id: req.user.id, user_name: req.user.name }, { transaction: t });

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [{ number: { [Op.like]: `%${req.query.search}%` } }, { title: { [Op.like]: `%${req.query.search}%` } }];
    }
    const SORTABLE = ['number', 'title', 'revision', 'status', 'total_amount', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { rows, count } = await Boq.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortDir]],
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'code'] },
      ],
      distinct: true,
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};
const get = async (req, res, next) => {
  try {
    const b = await Boq.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'code', 'client_name', 'contract_value'] },
        { model: BoqItem, as: 'items' },
        { model: BoqHistory, as: 'history' },
      ],
    });
    if (!b) return error(res, 'Not found', 404);
    const items = [...(b.items || [])].sort((a, x) => (a.sort_order - x.sort_order) || String(a.line_no).localeCompare(String(x.line_no)));
    return success(res, { ...b.toJSON(), items });
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  try {
    const b = await Boq.create({ ...req.body, ...org(req) });
    await hist(req, b.id, 'created', `Revision ${b.revision}`);
    return success(res, b, 'BOQ created', 201);
  } catch (e) { return next(e); }
};
const updateItem = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!boq) return error(res, 'Not found', 404);
    if (!['Draft', 'Submitted'].includes(boq.status)) return error(res, 'Only Draft/Submitted BOQs can be edited (create a revision)', 422);
    const item = await BoqItem.findOne({ where: { id: req.params.itemId, boq_id: boq.id, ...org(req) } });
    if (!item) return error(res, 'Item not found', 404);
    const qty = req.body.quantity !== undefined ? Number(req.body.quantity) : Number(item.quantity);
    const rate = req.body.unit_rate !== undefined ? Number(req.body.unit_rate) : Number(item.unit_rate);
    await item.update({ ...req.body, amount: qty * rate });
    const items = await BoqItem.findAll({ where: { boq_id: boq.id } });
    await boq.update({ total_amount: items.reduce((s, i) => s + Number(i.amount || 0), 0) });
    return success(res, item, 'Item updated');
  } catch (e) { return next(e); }
};
const addItem = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!boq) return error(res, 'Not found', 404);
    if (!['Draft', 'Submitted'].includes(boq.status)) return error(res, 'Only Draft/Submitted BOQs can be edited (create a revision)', 422);
    const qty = Number(req.body.quantity || 0);
    const rate = Number(req.body.unit_rate || 0);
    const maxSort = (await BoqItem.max('sort_order', { where: { boq_id: boq.id } })) || 0;
    const item = await BoqItem.create({ ...req.body, boq_id: boq.id, ...org(req), amount: qty * rate, sort_order: req.body.sort_order ?? maxSort + 1 });
    const items = await BoqItem.findAll({ where: { boq_id: boq.id } });
    await boq.update({ total_amount: items.reduce((s, i) => s + Number(i.amount || 0), 0) });
    return success(res, item, 'Item added', 201);
  } catch (e) { return next(e); }
};
const removeItem = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!boq) return error(res, 'Not found', 404);
    if (!['Draft', 'Submitted'].includes(boq.status)) return error(res, 'Only Draft/Submitted BOQs can be edited (create a revision)', 422);
    const item = await BoqItem.findOne({ where: { id: req.params.itemId, boq_id: boq.id, ...org(req) } });
    if (!item) return error(res, 'Item not found', 404);
    if (Number(item.billed_qty || 0) > 0) return error(res, 'Billed lines cannot be deleted', 422);
    await item.destroy();
    const items = await BoqItem.findAll({ where: { boq_id: boq.id } });
    await boq.update({ total_amount: items.reduce((s, i) => s + Number(i.amount || 0), 0) });
    return success(res, null, 'Item deleted');
  } catch (e) { return next(e); }
};
const transition = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!boq) return error(res, 'Not found', 404);
    const FLOW = { Draft: ['Submitted'], Submitted: ['Approved', 'Draft'], Approved: [], Revised: [] };
    if (!(FLOW[boq.status] || []).includes(req.body.status)) return error(res, `Cannot move BOQ from ${boq.status} to ${req.body.status}`, 422);
    await boq.update({ status: req.body.status });
    await hist(req, boq.id, req.body.status.toLowerCase(), `Revision ${boq.revision}`);
    return success(res, boq, 'BOQ ' + boq.status);
  } catch (e) { return next(e); }
};
const approve = async (req, res, next) => {
  req.body = { status: 'Approved' };
  if ((await Boq.findOne({ where: { id: req.params.id, ...org(req) } }))?.status !== 'Submitted') {
    const b = await Boq.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!b) return error(res, 'Not found', 404);
    if (b.status === 'Draft') { await b.update({ status: 'Submitted' }); await hist(req, b.id, 'submitted', `Revision ${b.revision}`); }
  }
  return transition(req, res, next);
};
const newRevision = async (req, res, next) => {
  const t = await Boq.sequelize.transaction();
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: BoqItem, as: 'items' }], transaction: t });
    if (!boq) { await t.rollback(); return error(res, 'Not found', 404); }
    if (boq.status !== 'Approved') { await t.rollback(); return error(res, 'Only Approved BOQs can be revised', 422); }
    await boq.update({ status: 'Revised' }, { transaction: t });
    await hist(req, boq.id, 'revised', `Superseded by revision ${boq.revision + 1}`, t);
    const copy = await Boq.create({
      ...org(req), project_id: boq.project_id, number: boq.number, title: boq.title,
      title_ar: boq.title_ar, revision: boq.revision + 1, status: 'Draft', total_amount: boq.total_amount,
    }, { transaction: t });
    for (const it of (boq.items || [])) {
      const j = it.toJSON();
      delete j.id; delete j.created_at; delete j.updated_at;
      await BoqItem.create({ ...j, boq_id: copy.id, progress_qty: 0, billed_qty: 0 }, { transaction: t });
    }
    await hist(req, copy.id, 'created', `Revision ${copy.revision} copied from rev ${boq.revision}`, t);
    await t.commit();
    return success(res, copy, 'Revision created', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
const revisions = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!boq) return error(res, 'Not found', 404);
    return success(res, await Boq.findAll({ where: { project_id: boq.project_id, number: boq.number, ...org(req) }, order: [['revision', 'ASC']] }));
  } catch (e) { return next(e); }
};
const compare = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const [a, b] = await Promise.all([
      Boq.findOne({ where: { id: from, ...org(req) }, include: [{ model: BoqItem, as: 'items' }] }),
      Boq.findOne({ where: { id: to, ...org(req) }, include: [{ model: BoqItem, as: 'items' }] }),
    ]);
    if (!a || !b) return error(res, 'Both revisions required', 404);
    const mapA = Object.fromEntries((a.items || []).map((i) => [i.line_no, i]));
    const mapB = Object.fromEntries((b.items || []).map((i) => [i.line_no, i]));
    const diff = [];
    for (const ln of new Set([...Object.keys(mapA), ...Object.keys(mapB)])) {
      const x = mapA[ln], y = mapB[ln];
      if (!x) diff.push({ line_no: ln, change: 'added', after: { quantity: y.quantity, unit_rate: y.unit_rate, amount: y.amount } });
      else if (!y) diff.push({ line_no: ln, change: 'removed', before: { quantity: x.quantity, unit_rate: x.unit_rate, amount: x.amount } });
      else if (Number(x.quantity) !== Number(y.quantity) || Number(x.unit_rate) !== Number(y.unit_rate)) {
        diff.push({ line_no: ln, change: 'changed', before: { quantity: x.quantity, unit_rate: x.unit_rate, amount: x.amount }, after: { quantity: y.quantity, unit_rate: y.unit_rate, amount: y.amount } });
      }
    }
    return success(res, { from: { id: a.id, revision: a.revision, total: a.total_amount }, to: { id: b.id, revision: b.revision, total: b.total_amount }, diff });
  } catch (e) { return next(e); }
};
const history = async (req, res, next) => {
  try {
    return success(res, await BoqHistory.findAll({ where: { boq_id: req.params.id, ...org(req) }, order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};
const costControl = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: BoqItem, as: 'items' }] });
    if (!boq) return error(res, 'Not found', 404);
    const rows = (boq.items || []).map((i) => {
      const qty = Number(i.quantity || 0), rate = Number(i.unit_rate || 0), cost = Number(i.cost_rate || 0);
      const prog = Number(i.progress_qty || 0), billed = Number(i.billed_qty || 0);
      return {
        id: i.id, line_no: i.line_no, description: i.description, unit: i.unit, division: i.division, trade: i.trade,
        quantity: qty, unit_rate: rate, amount: +(qty * rate).toFixed(2),
        cost_amount: +(qty * cost).toFixed(2), margin: +((rate - cost) * qty).toFixed(2),
        progress_qty: prog, progress_pct: qty ? +((prog / qty) * 100).toFixed(1) : 0,
        billed_qty: billed, to_bill_qty: +(qty - billed).toFixed(3),
      };
    });
    const divs = {};
    for (const r of rows) {
      const d = r.division || 'Unassigned';
      divs[d] = divs[d] || { division: d, amount: 0, cost: 0, progress_value: 0, billed_value: 0 };
      divs[d].amount += r.amount; divs[d].cost += r.cost_amount;
      divs[d].progress_value += r.progress_qty * Number((boq.items || []).find((x) => x.id === r.id)?.unit_rate || 0);
      divs[d].billed_value += r.billed_qty * Number((boq.items || []).find((x) => x.id === r.id)?.unit_rate || 0);
    }
    return success(res, { lines: rows, divisions: Object.values(divs).map((d) => ({ ...d, amount: +d.amount.toFixed(2), cost: +d.cost.toFixed(2), progress_value: +d.progress_value.toFixed(2), billed_value: +d.billed_value.toFixed(2) })) });
  } catch (e) { return next(e); }
};
const exportXlsx = async (req, res, next) => {
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: BoqItem, as: 'items' }] });
    if (!boq) return error(res, 'Not found', 404);
    const data = (boq.items || []).map((i) => ({
      'Line No': i.line_no, Description: i.description, Unit: i.unit,
      Quantity: Number(i.quantity || 0), 'Unit Rate': Number(i.unit_rate || 0), Amount: Number(i.amount || 0),
      Division: i.division || '', Trade: i.trade || '', 'Progress Qty': Number(i.progress_qty || 0), 'Billed Qty': Number(i.billed_qty || 0),
    }));
    data.push({ 'Line No': '', Description: 'TOTAL', Unit: '', Quantity: '', 'Unit Rate': '', Amount: Number(boq.total_amount || 0) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), `BOQ Rev${boq.revision}`);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="BOQ-${boq.number}-R${boq.revision}.xlsx"`);
    return res.send(buf);
  } catch (e) { return next(e); }
};
const billRemaining = async (req, res, next) => {
  const t = await Boq.sequelize.transaction();
  try {
    const boq = await Boq.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: BoqItem, as: 'items' }], transaction: t });
    if (!boq) { await t.rollback(); return error(res, 'Not found', 404); }
    if (boq.status !== 'Approved') { await t.rollback(); return error(res, 'Only Approved BOQs can be billed', 422); }
    const project = await Project.findOne({ where: { id: boq.project_id, ...org(req) }, transaction: t });
    const lines = (boq.items || []).map((i) => ({ item: i, qty: +(Number(i.quantity || 0) - Number(i.billed_qty || 0)).toFixed(3) })).filter((x) => x.qty > 0.001);
    if (!lines.length) { await t.rollback(); return error(res, 'Nothing left to bill', 422); }
    const { nextNumber } = require('./settingController');
    const gross = lines.reduce((s, x) => s + x.qty * Number(x.item.unit_rate || 0), 0);
    const retention = gross * (Number(project?.retention_pct || 0) / 100);
    const adv = Number(req.body.advance_recovery || 0);
    const vat = Math.max(0, gross - retention - adv) * (Number(project?.vat_pct || 0) / 100);
    const inv = await IpcInvoice.create({
      ...org(req), project_id: boq.project_id,
      number: req.body.number || await nextNumber(req.user.organization_id, 'ipc', t),
      gross_amount: +gross.toFixed(2), retention_amount: +retention.toFixed(2),
      advance_recovery: adv, discount: 0, vat_amount: +vat.toFixed(2),
      net_amount: +(gross - retention - adv + vat).toFixed(2), status: 'Draft',
    }, { transaction: t });
    for (const x of lines) {
      await IpcItem.create({
        ...org(req), ipc_id: inv.id, boq_item_id: x.item.id,
        description: x.item.description, unit: x.item.unit, qty: x.qty,
        unit_rate: x.item.unit_rate, amount: +(x.qty * Number(x.item.unit_rate || 0)).toFixed(2),
      }, { transaction: t });
      await x.item.update({ billed_qty: +(Number(x.item.billed_qty || 0) + x.qty).toFixed(3) }, { transaction: t });
    }
    await hist(req, boq.id, 'billed', `IPC ${inv.number} — ${lines.length} lines`, t);
    await t.commit();
    return success(res, inv, 'IPC draft created from BOQ', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
// ---- Templates ----
const listTemplates = async (req, res, next) => {
  try {
    return success(res, await BoqTemplate.findAll({ where: { ...org(req) }, include: [{ model: BoqTemplateItem, as: 'items' }], order: [['name', 'ASC']] }));
  } catch (e) { return next(e); }
};
const createTemplate = async (req, res, next) => {
  try {
    if (!req.body.name) return error(res, 'name required', 422);
    const tpl = await BoqTemplate.create({ ...req.body, ...org(req) });
    for (const it of (req.body.items || [])) await BoqTemplateItem.create({ ...it, template_id: tpl.id, ...org(req) });
    return success(res, await BoqTemplate.findByPk(tpl.id, { include: [{ model: BoqTemplateItem, as: 'items' }] }), 'Template created', 201);
  } catch (e) { return next(e); }
};
const instantiateTemplate = async (req, res, next) => {
  const t = await Boq.sequelize.transaction();
  try {
    const tpl = await BoqTemplate.findOne({ where: { id: req.params.tplId, ...org(req) }, include: [{ model: BoqTemplateItem, as: 'items' }], transaction: t });
    if (!tpl) { await t.rollback(); return error(res, 'Not found', 404); }
    if (!req.body.project_id || !req.body.number) { await t.rollback(); return error(res, 'project_id and number required', 422); }
    const boq = await Boq.create({ ...org(req), project_id: req.body.project_id, number: req.body.number, title: req.body.title || tpl.name, revision: 1, status: 'Draft' }, { transaction: t });
    let total = 0;
    for (const it of (tpl.items || [])) {
      const qty = Number(req.body.default_quantity || 0);
      await BoqItem.create({ ...org(req), boq_id: boq.id, line_no: it.line_no, description: it.description, unit: it.unit, division: it.division, trade: it.trade, quantity: qty, unit_rate: it.unit_rate, cost_rate: it.cost_rate, amount: qty * Number(it.unit_rate || 0), sort_order: it.sort_order }, { transaction: t });
      total += qty * Number(it.unit_rate || 0);
    }
    await boq.update({ total_amount: total }, { transaction: t });
    await hist(req, boq.id, 'created', `From template ${tpl.name}`, t);
    await t.commit();
    return success(res, boq, 'BOQ created from template', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
module.exports = {
  list, get, create, addItem, updateItem, removeItem, transition, approve,
  newRevision, revisions, compare, history, costControl, exportXlsx, billRemaining,
  listTemplates, createTemplate, instantiateTemplate,
};
