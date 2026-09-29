const { Tender } = require('../models');
const { success } = require('../utils/responseHandler');
const list = async (req, res, next) => {
  try {
    const rows = await Tender.findAll({
      where: { organization_id: req.user.organization_id, ...(req.query.project_id ? { project_id: req.query.project_id } : {}) },
      order: [['created_at', 'DESC']],
    });
    return success(res, rows);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  try {
    const t = await Tender.create({ ...req.body, organization_id: req.user.organization_id });
    return success(res, t, 'Tender created', 201);
  } catch (e) { return next(e); }
};
const submit = async (req, res, next) => {
  try {
    const t = await Tender.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!t) return success(res, null, 'Not found', 404);
    await t.update({ status: 'Submitted', submitted_at: new Date() });
    return success(res, t, 'Submitted');
  } catch (e) { return next(e); }
};
const decision = async (req, res, next) => {
  try {
    const { status } = req.body; // Won | Lost | Cancelled
    if (!['Won', 'Lost', 'Cancelled'].includes(status)) return success(res, null, 'status must be Won|Lost|Cancelled', 422);
    const t = await Tender.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!t) return success(res, null, 'Not found', 404);
    await t.update({ status });
    if (status === 'Won') {
      const { Project } = require('../models');
      await Project.update({ status: 'Awarded' }, { where: { id: t.project_id, organization_id: req.user.organization_id } });
    }
    return success(res, t, 'Tender ' + status);
  } catch (e) { return next(e); }
};
module.exports = { list, create, submit, decision };
