const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { Estimation, EstimationItem, Project } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const { nextNumber } = require('./settingController');

const org = (req) => ({ organization_id: req.user.organization_id });
const r2 = (n) => +Number(n || 0).toFixed(2);
const EST_FLOW = { Draft: ['Submitted'], Submitted: ['Approved', 'Rejected', 'Draft'], Approved: [], Rejected: ['Draft'] };

const calcTotals = (b) => {
  const m = Number(b.material_cost || 0), l = Number(b.labor_cost || 0), e = Number(b.equipment_cost || 0), s = Number(b.subcontract_cost || 0);
  const base = m + l + e + s;
  const oh = base * (Number(b.overhead_pct || 0) / 100);
  const direct = base + oh;
  const cont = direct * (Number(b.contingency_pct || 0) / 100);
  const esc = direct * (Number(b.escalation_pct || 0) / 100);
  const total = direct + cont + esc;
  const sell = total * (1 + Number(b.margin_pct || 0) / 100);
  return { total_cost: r2(total), sell_total: r2(sell) };
};

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where[Op.or] = [{ number: { [Op.like]: `%${req.query.search}%` } }];
    }
    const SORTABLE = ['number', 'revision', 'status', 'total_cost', 'sell_total', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { rows, count } = await Estimation.findAndCountAll({
      where, limit, offset, order: [[sortBy, sortDir]], distinct: true,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'code', 'name'] },
        { model: EstimationItem, as: 'items' },
      ],
    });
    const data = rows.map((r) => {
      const j = r.toJSON();
      j.items = [...(j.items || [])].sort((a, b) => (a.sort_order - b.sort_order));
      j.allowed_transitions = EST_FLOW[j.status] || [];
      return j;
    });
    return paginated(res, data, count, page, limit);
  } catch (e) { return next(e); }
};

const get = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'code', 'name', 'client_name'] },
        { model: EstimationItem, as: 'items' },
      ],
    });
    if (!est) return error(res, 'Not found', 404);
    const j = est.toJSON();
    j.items = [...(j.items || [])].sort((a, b) => (a.sort_order - b.sort_order));
    j.allowed_transitions = EST_FLOW[j.status] || [];
    return success(res, j);
  } catch (e) { return next(e); }
};

const create = async (req, res, next) => {
  try {
    let projectId = req.body.project_id;
    if (!projectId && req.body.project_name) {
      const [proj] = await Project.findOrCreate({
        where: { name: req.body.project_name.trim(), organization_id: req.user.organization_id },
        defaults: {
          code: 'PRJ-' + Math.floor(1000 + Math.random() * 9000),
          client_name: req.body.customer_name || 'Client',
          organization_id: req.user.organization_id,
        },
      });
      projectId = proj.id;
    }
    if (!projectId) {
      const p = await Project.findOne({ where: { ...org(req) } });
      if (p) projectId = p.id;
    }
    if (!projectId) return error(res, 'Target Project is required', 422);

    const t = calcTotals(req.body);
    const estNumber = (!req.body.auto_generate_job_no && req.body.number && req.body.number.trim())
      ? req.body.number.trim()
      : await nextNumber(req.user.organization_id, 'estimation');

    const est = await Estimation.create({
      ...req.body,
      project_id: projectId,
      ...t,
      ...org(req),
      number: estNumber,
    });

    // If copying from an existing estimation
    if (req.body.copy_estimation_id) {
      const srcItems = await EstimationItem.findAll({ where: { estimation_id: req.body.copy_estimation_id } });
      for (const it of srcItems) {
        const itemData = it.toJSON();
        delete itemData.id;
        delete itemData.created_at;
        delete itemData.updated_at;
        await EstimationItem.create({ ...itemData, estimation_id: est.id, ...org(req) });
      }
      await retotal(est);
    }

    // Link enquiry status if provided
    if (req.body.enquiry_id) {
      const { Enquiry } = require('../models');
      await Enquiry.update({ status: 'Estimated' }, { where: { id: req.body.enquiry_id, ...org(req) } });
    }

    return success(res, est, 'Estimation created', 201);
  } catch (e) { return next(e); }
};

const retotal = async (est) => {
  const items = await EstimationItem.findAll({ where: { estimation_id: est.id } });
  const heads = { Material: 0, Labor: 0, Equipment: 0, Subcontract: 0 };
  for (const i of items) {
    const qty = Number(i.quantity || 0);
    const c = qty * Number(i.unit_cost || 0);
    const rt = i.resource_type || 'Mixed';
    if (['Material', 'Labor', 'Equipment', 'Subcontract'].includes(rt)) {
      heads[rt] += c;
    } else {
      const m = qty * Number(i.material_rate || 0);
      const l = qty * Number(i.labor_rate || 0);
      const e = qty * Number(i.equipment_rate || 0);
      heads.Material += m; heads.Labor += l; heads.Equipment += e;
      const rest = c - m - l - e;
      if (rest > 0) heads.Material += rest;
    }
  }
  await est.update({
    material_cost: r2(heads.Material), labor_cost: r2(heads.Labor),
    equipment_cost: r2(heads.Equipment), subcontract_cost: r2(heads.Subcontract),
    ...calcTotals({ ...est.toJSON(), material_cost: heads.Material, labor_cost: heads.Labor, equipment_cost: heads.Equipment, subcontract_cost: heads.Subcontract }),
  });
};

const addItem = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!est) return error(res, 'Not found', 404);
    if (!['Draft', 'Rejected'].includes(est.status)) return error(res, 'Only Draft/Rejected estimations can be edited', 422);
    const q = Number(req.body.quantity || 0);
    const uc = Number(req.body.unit_cost || 0);
    const us = req.body.unit_sell !== undefined ? Number(req.body.unit_sell) : uc;
    const maxSort = (await EstimationItem.max('sort_order', { where: { estimation_id: est.id } })) || 0;
    const item = await EstimationItem.create({
      ...req.body, estimation_id: est.id, ...org(req),
      unit_cost: uc, unit_sell: us, total_cost: r2(q * uc), total_sell: r2(q * us),
      sort_order: req.body.sort_order ?? maxSort + 1,
    });
    await retotal(est);
    return success(res, item, 'Item added', 201);
  } catch (e) { return next(e); }
};

const updateItem = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!est) return error(res, 'Not found', 404);
    if (!['Draft', 'Rejected'].includes(est.status)) return error(res, 'Only Draft/Rejected estimations can be edited', 422);
    const item = await EstimationItem.findOne({ where: { id: req.params.itemId, estimation_id: est.id, ...org(req) } });
    if (!item) return error(res, 'Item not found', 404);
    await item.update(req.body);
    const q = Number(item.quantity || 0);
    await item.update({ total_cost: r2(q * Number(item.unit_cost || 0)), total_sell: r2(q * Number(item.unit_sell || 0)) });
    await retotal(est);
    return success(res, item, 'Item updated');
  } catch (e) { return next(e); }
};

const removeItem = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!est) return error(res, 'Not found', 404);
    if (!['Draft', 'Rejected'].includes(est.status)) return error(res, 'Only Draft/Rejected estimations can be edited', 422);
    const item = await EstimationItem.findOne({ where: { id: req.params.itemId, estimation_id: est.id, ...org(req) } });
    if (!item) return error(res, 'Item not found', 404);
    await item.destroy();
    await retotal(est);
    return success(res, null, 'Item deleted');
  } catch (e) { return next(e); }
};

const updateHeader = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!est) return error(res, 'Not found', 404);
    if (!['Draft', 'Rejected'].includes(est.status)) return error(res, 'Only Draft/Rejected estimations can be edited', 422);
    await est.update({ ...req.body, ...calcTotals({ ...est.toJSON(), ...req.body }) });
    return success(res, est, 'Estimation updated');
  } catch (e) { return next(e); }
};

const transition = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!est) return error(res, 'Not found', 404);
    if (!(EST_FLOW[est.status] || []).includes(req.body.status)) return error(res, `Cannot move estimation from ${est.status} to ${req.body.status}`, 422);
    await est.update({ status: req.body.status });
    return success(res, est, 'Estimation ' + est.status);
  } catch (e) { return next(e); }
};

const approve = async (req, res, next) => {
  req.body = { status: 'Approved' };
  const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) } });
  if (!est) return error(res, 'Not found', 404);
  if (est.status === 'Draft') await est.update({ status: 'Submitted' });
  return transition(req, res, next);
};

const newRevision = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: EstimationItem, as: 'items' }] });
    if (!est) return error(res, 'Not found', 404);
    if (est.status !== 'Approved') return error(res, 'Only Approved estimations can be revised', 422);
    const j = est.toJSON();
    const items = j.items || [];
    delete j.id; delete j.created_at; delete j.updated_at; delete j.items;
    const copy = await Estimation.create({ ...j, revision: est.revision + 1, status: 'Draft' });
    for (const it of items) {
      const k = { ...it };
      delete k.id; delete k.created_at; delete k.updated_at;
      await EstimationItem.create({ ...k, estimation_id: copy.id });
    }
    return success(res, copy, 'Revision created', 201);
  } catch (e) { return next(e); }
};

const exportXlsx = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: EstimationItem, as: 'items' }] });
    if (!est) return error(res, 'Not found', 404);
    const cover = [
      { Field: 'Estimation No', Value: `${est.number} Rev ${est.revision}` },
      { Field: 'Status', Value: est.status },
      { Field: 'Material', Value: Number(est.material_cost || 0) },
      { Field: 'Labor', Value: Number(est.labor_cost || 0) },
      { Field: 'Equipment', Value: Number(est.equipment_cost || 0) },
      { Field: 'Subcontract', Value: Number(est.subcontract_cost || 0) },
      { Field: 'Overhead %', Value: Number(est.overhead_pct || 0) },
      { Field: 'Contingency %', Value: Number(est.contingency_pct || 0) },
      { Field: 'Escalation %', Value: Number(est.escalation_pct || 0) },
      { Field: 'Margin %', Value: Number(est.margin_pct || 0) },
      { Field: 'Total Cost', Value: Number(est.total_cost || 0) },
      { Field: 'Sell Total', Value: Number(est.sell_total || 0) },
    ];
    const rows = (est.items || []).map((i) => ({
      Division: i.division || '', Resource: i.resource_type, Description: i.description, Unit: i.unit,
      Quantity: Number(i.quantity || 0), 'Unit Cost': Number(i.unit_cost || 0), 'Total Cost': Number(i.total_cost || 0),
      'Unit Sell': Number(i.unit_sell || 0), 'Total Sell': Number(i.total_sell || 0),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cover), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Build-up');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Estimation-${est.number}-R${est.revision}.xlsx"`);
    return res.send(buf);
  } catch (e) { return next(e); }
};

module.exports = { list, get, create, addItem, updateItem, removeItem, updateHeader, transition, approve, newRevision, exportXlsx };
