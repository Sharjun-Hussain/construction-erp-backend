const { Customer, CustomerContact, Project, IpcInvoice, ClientAdvance } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const sum = (rows, f) => rows.reduce((s, r) => s + Number(r[f] || 0), 0);

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.is_active !== undefined && req.query.is_active !== '') where.is_active = req.query.is_active === 'true';
    if (req.query.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [{ code: { [Op.like]: `%${req.query.search}%` } }, { name: { [Op.like]: `%${req.query.search}%` } }, { vat_number: { [Op.like]: `%${req.query.search}%` } }];
    }
    const SORTABLE = ['code', 'name', 'city', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'name';
    const sortDir = String(req.query.sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const { rows, count } = await Customer.findAndCountAll({ where, limit, offset, order: [[sortBy, sortDir]] });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.code) return error(res, 'code and name required', 422);
    return success(res, await Customer.create({ ...req.body, ...org(req) }), 'Customer created', 201);
  } catch (e) { return next(e); }
};
const get = async (req, res, next) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: Project, as: 'projects', attributes: ['id', 'code', 'name', 'status', 'contract_value'] }] });
    if (!c) return error(res, 'Not found', 404);
    return success(res, c);
  } catch (e) { return next(e); }
};
const update = async (req, res, next) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!c) return error(res, 'Not found', 404);
    await c.update(req.body);
    return success(res, c, 'Updated');
  } catch (e) { return next(e); }
};
const remove = async (req, res, next) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!c) return error(res, 'Not found', 404);
    if (await Project.count({ where: { client_id: c.id, ...org(req) } }) > 0) return error(res, 'Customer has linked projects', 422);
    await c.destroy();
    return success(res, null, 'Customer deleted');
  } catch (e) { return next(e); }
};
const statement = async (req, res, next) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!c) return error(res, 'Not found', 404);
    const projects = await Project.findAll({ where: { client_id: c.id, ...org(req) }, attributes: ['id', 'code', 'name', 'status', 'contract_value'] });
    const pIds = projects.map((p) => p.id);
    const [ipcs, advs] = pIds.length ? await Promise.all([
      IpcInvoice.findAll({ where: { project_id: pIds, ...org(req) }, order: [['created_at', 'DESC']] }),
      ClientAdvance.findAll({ where: { project_id: pIds, ...org(req) } }),
    ]) : [[], []];
    const billed = sum(ipcs.filter((x) => x.status === 'Paid'), 'net_amount');
    const open = ipcs.filter((x) => x.status === 'Approved' || x.status === 'Submitted');
    const outstanding = sum(open, 'net_amount');
    const now = Date.now();
    const age = (d) => Math.floor((now - new Date(d).getTime()) / 864e5);
    const aging = { d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
    for (const x of open) {
      const a = age(x.created_at);
      const v = Number(x.net_amount || 0);
      if (a <= 30) aging.d0_30 += v;
      else if (a <= 60) aging.d31_60 += v;
      else if (a <= 90) aging.d61_90 += v;
      else aging.d90 += v;
    }
    Object.keys(aging).forEach((k) => { aging[k] = +aging[k].toFixed(2); });
    return success(res, {
      customer: c, projects,
      contract_total: sum(projects, 'contract_value'),
      billed_paid: +billed.toFixed(2), outstanding: +outstanding.toFixed(2),
      aging,
      advances_balance: +(sum(advs, 'amount') - sum(advs, 'recovered')).toFixed(2),
      invoices: ipcs.map((x) => ({ id: x.id, project_id: x.project_id, number: x.number, net_amount: x.net_amount, status: x.status, age_days: age(x.created_at) })),
    });
  } catch (e) { return next(e); }
};
const listContacts = async (req, res, next) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!c) return error(res, 'Not found', 404);
    return success(res, await CustomerContact.findAll({ where: { customer_id: c.id, ...org(req) }, order: [['is_primary', 'DESC'], ['name', 'ASC']] }));
  } catch (e) { return next(e); }
};
const addContact = async (req, res, next) => {
  const t = await CustomerContact.sequelize.transaction();
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!c) { await t.rollback(); return error(res, 'Not found', 404); }
    if (!req.body.name) { await t.rollback(); return error(res, 'name required', 422); }
    if (req.body.is_primary) await CustomerContact.update({ is_primary: false }, { where: { customer_id: c.id }, transaction: t });
    const contact = await CustomerContact.create({ ...req.body, customer_id: c.id, ...org(req) }, { transaction: t });
    await t.commit();
    return success(res, contact, 'Contact added', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
const removeContact = async (req, res, next) => {
  try {
    const k = await CustomerContact.findOne({ where: { id: req.params.contactId, customer_id: req.params.id, ...org(req) } });
    if (!k) return error(res, 'Not found', 404);
    await k.destroy();
    return success(res, null, 'Contact removed');
  } catch (e) { return next(e); }
};
module.exports = { list, create, get, update, remove, statement, listContacts, addContact, removeContact };
