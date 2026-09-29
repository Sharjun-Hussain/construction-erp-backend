const { Estimation, EstimationItem } = require('../models');
const { success } = require('../utils/responseHandler');
const calcTotals = (b) => {
  const m = Number(b.material_cost || 0), l = Number(b.labor_cost || 0), e = Number(b.equipment_cost || 0);
  const base = m + l + e;
  const oh = base * (Number(b.overhead_pct || 0) / 100);
  const total = base + oh;
  const sell = total * (1 + Number(b.margin_pct || 0) / 100);
  return { total_cost: total, sell_total: sell };
};
const list = async (req, res, next) => {
  try {
    const rows = await Estimation.findAll({ where: { organization_id: req.user.organization_id, ...(req.query.project_id ? { project_id: req.query.project_id } : {}) }, include: [{ model: EstimationItem, as: 'items' }], order: [['created_at', 'DESC']] });
    return success(res, rows);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  try {
    const t = calcTotals(req.body);
    const est = await Estimation.create({ ...req.body, ...t, organization_id: req.user.organization_id });
    return success(res, est, 'Estimation created', 201);
  } catch (e) { return next(e); }
};
const addItem = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!est) return success(res, null, 'Not found', 404);
    const q = Number(req.body.quantity || 0);
    const uc = Number(req.body.unit_cost || 0);
    const us = Number(req.body.unit_sell || uc);
    const item = await EstimationItem.create({ ...req.body, estimation_id: est.id, organization_id: req.user.organization_id, total_cost: q * uc, total_sell: q * us });
    return success(res, item, 'Item added', 201);
  } catch (e) { return next(e); }
};
const approve = async (req, res, next) => {
  try {
    const est = await Estimation.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!est) return success(res, null, 'Not found', 404);
    await est.update({ status: 'Approved' });
    return success(res, est, 'Approved');
  } catch (e) { return next(e); }
};
module.exports = { list, create, addItem, approve };
