const { Op } = require('sequelize');
const { PriceList, ItemPrice } = require('../models');
const { success, error } = require('../utils/responseHandler');

const org = (req) => ({ organization_id: req.user.organization_id });

const list = async (req, res, next) => {
  try {
    const where = { ...org(req) };
    if (req.query.active === '1') where.is_active = true;
    if (req.query.search) {
      where[Op.or] = [{ name: { [Op.like]: `%${req.query.search}%` } }, { name_ar: { [Op.like]: `%${req.query.search}%` } }];
    }
    const rows = await PriceList.findAll({ where, order: [['is_default', 'DESC'], ['name', 'ASC']] });
    const data = await Promise.all(rows.map(async (r) => {
      const j = r.toJSON();
      j.items_using = await ItemPrice.count({ where: { ...org(req), price_list: r.name } });
      return j;
    }));
    return success(res, data);
  } catch (e) { return next(e); }
};

const create = async (req, res, next) => {
  const t = await PriceList.sequelize.transaction();
  try {
    if (!req.body.name?.trim()) { await t.rollback(); return error(res, 'Price list name required', 422); }
    if (req.body.is_default) {
      await PriceList.update({ is_default: false }, { where: { ...org(req) }, transaction: t });
    }
    const r = await PriceList.create({ ...req.body, name: req.body.name.trim(), ...org(req) }, { transaction: t });
    await t.commit();
    return success(res, r, 'Price list created', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

const update = async (req, res, next) => {
  const t = await PriceList.sequelize.transaction();
  try {
    const r = await PriceList.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!r) { await t.rollback(); return error(res, 'Not found', 404); }
    if (req.body.is_default) {
      await PriceList.update({ is_default: false }, { where: { ...org(req) }, transaction: t });
    }
    if (req.body.name !== undefined && !String(req.body.name).trim()) { await t.rollback(); return error(res, 'Price list name required', 422); }
    await r.update(req.body, { transaction: t });
    await t.commit();
    return success(res, r, 'Price list updated');
  } catch (e) { await t.rollback(); return next(e); }
};

const remove = async (req, res, next) => {
  try {
    const r = await PriceList.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!r) return error(res, 'Not found', 404);
    const used = await ItemPrice.count({ where: { ...org(req), price_list: r.name } });
    if (used > 0) return error(res, `Price list is used by ${used} item price row(s) — deactivate instead`, 422);
    await r.destroy();
    return success(res, null, 'Price list deleted');
  } catch (e) { return next(e); }
};

module.exports = { list, create, update, remove };
