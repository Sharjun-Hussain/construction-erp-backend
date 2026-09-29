const { DprLog, DprLine, BoqItem, VariationOrder, Project, ProjectMilestone } = require('../models');
const { success } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
// ---- DPR ----
const listDPR = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await DprLog.findAll({ where, include: [{ model: DprLine, as: 'lines' }], order: [['date', 'DESC']] }));
  } catch (e) { return next(e); }
};
const createDPR = async (req, res, next) => {
  try {
    const { isLocked } = require('./mastersController');
    if (await isLocked(req.user.organization_id, 'dpr', req.body.date)) return success(res, null, 'Period is closed for DPR entries', 422);
    const dpr = await DprLog.create({ ...req.body, ...org(req), submitted_by: req.user.id });
    for (const ln of (req.body.lines || [])) {
      await DprLine.create({ dpr_id: dpr.id, ...org(req), boq_item_id: ln.boq_item_id, qty_done: ln.qty_done, remarks: ln.remarks });
    }
    return success(res, await DprLog.findByPk(dpr.id, { include: [{ model: DprLine, as: 'lines' }] }), 'DPR created', 201);
  } catch (e) { return next(e); }
};
const approveDPR = async (req, res, next) => {
  const t = await DprLog.sequelize.transaction();
  try {
    const dpr = await DprLog.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: DprLine, as: 'lines' }], transaction: t });
    if (!dpr) { await t.rollback(); return success(res, null, 'Not found', 404); }
    if (dpr.status === 'Approved') { await t.rollback(); return success(res, dpr, 'Already approved'); }
    for (const ln of dpr.lines) {
      const item = await BoqItem.findOne({ where: { id: ln.boq_item_id, ...org(req) }, transaction: t });
      if (item) await item.update({ progress_qty: Number(item.progress_qty || 0) + Number(ln.qty_done) }, { transaction: t });
    }
    await dpr.update({ status: 'Approved' }, { transaction: t });
    await t.commit();
    return success(res, dpr, 'DPR approved, BOQ progress updated');
  } catch (e) { await t.rollback(); return next(e); }
};
// ---- Variations ----
const listVO = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await VariationOrder.findAll({ where, order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};
const createVO = async (req, res, next) => {
  try { return success(res, await VariationOrder.create({ ...req.body, ...org(req) }), 'Variation created', 201); }
  catch (e) { return next(e); }
};
const approveVO = async (req, res, next) => {
  const t = await VariationOrder.sequelize.transaction();
  try {
    const vo = await VariationOrder.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!vo) { await t.rollback(); return success(res, null, 'Not found', 404); }
    await vo.update({ status: req.body.status === 'Rejected' ? 'Rejected' : 'Approved' }, { transaction: t });
    if (vo.status === 'Approved') {
      const p = await Project.findOne({ where: { id: vo.project_id, ...org(req) }, transaction: t });
      if (p) await p.update({ contract_value: Number(p.contract_value || 0) + Number(vo.amount) }, { transaction: t });
    }
    await t.commit();
    return success(res, vo, 'Variation ' + vo.status);
  } catch (e) { await t.rollback(); return next(e); }
};
// ---- Milestones ----
const listMS = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await ProjectMilestone.findAll({ where, order: [['due_date', 'ASC']] }));
  } catch (e) { return next(e); }
};
const createMS = async (req, res, next) => {
  try { return success(res, await ProjectMilestone.create({ ...req.body, ...org(req) }), 'Milestone created', 201); }
  catch (e) { return next(e); }
};
const updateMS = async (req, res, next) => {
  try {
    const m = await ProjectMilestone.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!m) return success(res, null, 'Not found', 404);
    await m.update(req.body);
    return success(res, m, 'Updated');
  } catch (e) { return next(e); }
};
module.exports = { listDPR, createDPR, approveDPR, listVO, createVO, approveVO, listMS, createMS, updateMS };
