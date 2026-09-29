const { Subcontractor, ScWorkOrder, ScCertificate } = require('../models');
const { success } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const listSC = async (req, res, next) => {
  try { return success(res, await Subcontractor.findAll({ where: org(req), order: [['name', 'ASC']] })); }
  catch (e) { return next(e); }
};
const createSC = async (req, res, next) => {
  try { return success(res, await Subcontractor.create({ ...req.body, ...org(req) }), 'Subcontractor created', 201); }
  catch (e) { return next(e); }
};
const listWO = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await ScWorkOrder.findAll({ where, include: [{ model: ScCertificate, as: 'certificates' }], order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};
const createWO = async (req, res, next) => {
  try { return success(res, await ScWorkOrder.create({ ...req.body, ...org(req) }), 'Work order created', 201); }
  catch (e) { return next(e); }
};
const approveWO = async (req, res, next) => {
  try {
    const wo = await ScWorkOrder.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!wo) return success(res, null, 'Not found', 404);
    await wo.update({ status: 'Approved' });
    return success(res, wo, 'Approved');
  } catch (e) { return next(e); }
};
const certify = async (req, res, next) => {
  try {
    const wo = await ScWorkOrder.findOne({ where: { id: req.body.sc_work_order_id, ...org(req) } });
    if (!wo) return success(res, null, 'Work order not found', 404);
    const gross = Number(req.body.gross || 0);
    if (Number(wo.certified_total || 0) + gross > Number(wo.amount) + 0.01)
      return success(res, null, 'Certified exceeds work order amount', 422);
    const retention = gross * (Number(wo.retention_pct || 0) / 100);
    const adv = Number(req.body.advance_recovery || 0);
    const back = Number(req.body.back_charge || 0);
    const cert = await ScCertificate.create({
      ...req.body, ...org(req), project_id: wo.project_id,
      retention, net: gross - retention - adv - back,
    });
    await wo.update({ certified_total: Number(wo.certified_total || 0) + gross });
    return success(res, cert, 'Certificate created', 201);
  } catch (e) { return next(e); }
};
const approveCert = async (req, res, next) => {
  try {
    const cert = await ScCertificate.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!cert) return success(res, null, 'Not found', 404);
    await cert.update({ status: 'Approved' });
    return success(res, cert, 'Approved');
  } catch (e) { return next(e); }
};
module.exports = { listSC, createSC, listWO, createWO, approveWO, certify, approveCert };
