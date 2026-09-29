const { Guarantee } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const withExpiry = (g) => {
  const j = g.toJSON ? g.toJSON() : g;
  const exp = j.expiry_date ? new Date(j.expiry_date) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  j.is_expired = !!(exp && exp < today && (j.status === 'Active' || j.status === 'Draft'));
  j.days_to_expiry = exp ? Math.ceil((exp - today) / 864e5) : null;
  return j;
};
const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    const { rows, count } = await Guarantee.findAndCountAll({ where, limit, offset, order: [['expiry_date', 'ASC']] });
    return paginated(res, rows.map(withExpiry), count, page, limit);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  try {
    if (!req.body.number || !req.body.project_id) return error(res, 'number and project_id required', 422);
    return success(res, withExpiry(await Guarantee.create({ ...req.body, ...org(req) })), 'Guarantee recorded', 201);
  } catch (e) { return next(e); }
};
const get = async (req, res, next) => {
  try {
    const g = await Guarantee.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!g) return error(res, 'Not found', 404);
    return success(res, withExpiry(g));
  } catch (e) { return next(e); }
};
const update = async (req, res, next) => {
  try {
    const g = await Guarantee.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!g) return error(res, 'Not found', 404);
    if (['Released', 'Claimed'].includes(g.status)) return error(res, 'Closed guarantees cannot be edited', 422);
    await g.update(req.body);
    return success(res, withExpiry(g), 'Updated');
  } catch (e) { return next(e); }
};
const transition = async (req, res, next) => {
  try {
    const g = await Guarantee.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!g) return error(res, 'Not found', 404);
    const FLOW = { Draft: ['Active', 'Expired'], Active: ['Released', 'Claimed', 'Expired'], Expired: ['Released'], Released: [], Claimed: [] };
    if (!(FLOW[g.status] || []).includes(req.body.status)) return error(res, `Cannot move guarantee from ${g.status} to ${req.body.status}`, 422);
    await g.update({ status: req.body.status });
    return success(res, withExpiry(g), 'Guarantee ' + g.status);
  } catch (e) { return next(e); }
};
const remove = async (req, res, next) => {
  try {
    const g = await Guarantee.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!g) return error(res, 'Not found', 404);
    if (g.status === 'Active') return error(res, 'Active guarantees cannot be deleted', 422);
    await g.destroy();
    return success(res, null, 'Guarantee deleted');
  } catch (e) { return next(e); }
};
const expiring = async (req, res, next) => {
  try {
    const days = Math.max(1, parseInt(req.query.days || '30', 10));
    const { Op } = require('sequelize');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const until = new Date(today.getTime() + days * 864e5);
    const rows = await Guarantee.findAll({
      where: { ...org(req), status: 'Active', expiry_date: { [Op.lte]: until } },
      order: [['expiry_date', 'ASC']],
    });
    return success(res, rows.map(withExpiry));
  } catch (e) { return next(e); }
};
module.exports = { list, create, get, update, transition, remove, expiring };
