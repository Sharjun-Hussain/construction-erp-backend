const { Op } = require('sequelize');
const { ChangeRequest, VariationOrder, Project } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const { nextNumber } = require('./settingController');

const org = (req) => ({ organization_id: req.user.organization_id });
const CR_FLOW = { Raised: ['UnderReview', 'Rejected'], UnderReview: ['Approved', 'Rejected'], Approved: ['Converted', 'Rejected'], Rejected: [], Converted: [] };

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.origin) where.origin = req.query.origin;
    if (req.query.search) {
      where[Op.or] = [{ number: { [Op.like]: `%${req.query.search}%` } }, { title: { [Op.like]: `%${req.query.search}%` } }];
    }
    const { rows, count } = await ChangeRequest.findAndCountAll({
      where, limit, offset, order: [['created_at', 'DESC']], distinct: true,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'code', 'name'] },
        { model: VariationOrder, as: 'variation', attributes: ['id', 'number', 'status', 'amount'] },
      ],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const create = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await nextNumber(req.user.organization_id, 'changerequest');
    if (!body.project_id || !body.title) return error(res, 'project_id and title required', 422);
    const cr = await ChangeRequest.create({ ...body, raised_date: body.raised_date || new Date(), ...org(req) });
    return success(res, cr, 'Change request raised', 201);
  } catch (e) { return next(e); }
};

const transition = async (req, res, next) => {
  try {
    const cr = await ChangeRequest.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!cr) return error(res, 'Not found', 404);
    if (!(CR_FLOW[cr.status] || []).includes(req.body.status)) return error(res, `Cannot move change request from ${cr.status} to ${req.body.status}`, 422);
    await cr.update({ status: req.body.status, review_notes: req.body.review_notes ?? cr.review_notes });
    return success(res, cr, 'Change request ' + cr.status);
  } catch (e) { return next(e); }
};

// Approved CR -> priced Variation Order (uses existing VO numbering/flow)
const convert = async (req, res, next) => {
  const t = await ChangeRequest.sequelize.transaction();
  try {
    const cr = await ChangeRequest.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!cr) { await t.rollback(); return error(res, 'Not found', 404); }
    if (cr.variation_id) { await t.rollback(); return error(res, 'Already converted', 422); }
    if (cr.status !== 'Approved') { await t.rollback(); return error(res, 'Only Approved change requests can be converted', 422); }
    const vo = await VariationOrder.create({
      ...org(req), project_id: cr.project_id,
      number: req.body.number || `VO-${cr.number}`,
      description: req.body.description || `${cr.title}\n${cr.description || ''}`.trim(),
      amount: req.body.amount !== undefined ? Number(req.body.amount) : Number(cr.cost_impact || 0),
      impact_days: req.body.impact_days !== undefined ? Number(req.body.impact_days) : Number(cr.time_impact_days || 0),
      status: 'Draft',
    }, { transaction: t });
    await cr.update({ status: 'Converted', variation_id: vo.id }, { transaction: t });
    await t.commit();
    return success(res, { change_request: cr, variation: vo }, 'Change request converted to variation order', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

module.exports = { list, create, transition, convert };
