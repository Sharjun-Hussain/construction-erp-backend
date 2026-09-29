const { Op } = require('sequelize');
const {
  Material, ItemPrice, ItemSpec, SiteStock, Document,
  PurchaseOrderItem, GrnItem, MaterialIndentItem, Supplier, VatRate,
} = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const { nextNumber } = require('./settingController');

const org = (req) => ({ organization_id: req.user.organization_id });
const NUMS = ['vat_pct', 'discount_pct', 'tolerance_pct', 'conversion_factor', 'weight_kg', 'length_m', 'width_m', 'height_m', 'max_qty', 'reorder_qty', 'min_qty', 'purchase_price', 'sell_price', 'last_rate', 'lead_time_days', 'shelf_life_days'];
const num = (v) => (v === '' || v === undefined || v === null ? v : Number(v));
const coerce = (b) => {
  const out = { ...b };
  for (const k of NUMS) if (out[k] !== undefined) out[k] = num(out[k]);
  return out;
};

const findItem = (req, id) => Material.findOne({ where: { id, ...org(req) } });

// ---- Detail (item + prices + specs + stock + images) ----
const get = async (req, res, next) => {
  try {
    const m = await Material.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: ItemPrice, as: 'prices' },
        { model: ItemSpec, as: 'specs' },
        { model: Supplier, as: 'preferred_supplier', attributes: ['id', 'code', 'name'] },
        { model: VatRate, as: 'vat_rate', attributes: ['id', 'name', 'rate'] },
      ],
    });
    if (!m) return error(res, 'Not found', 404);
    const j = m.toJSON();
    j.specs = [...(j.specs || [])].sort((a, b) => (a.sort_order - b.sort_order));
    j.prices = [...(j.prices || [])].sort((a, b) => String(a.price_list).localeCompare(String(b.price_list)));
    j.stock = await SiteStock.findAll({ where: { ...org(req), material_code: m.code }, attributes: ['project_id', 'qty'] });
    j.on_hand = j.stock.reduce((s, r) => s + Number(r.qty || 0), 0);
    j.images = await Document.findAll({ where: { ...org(req), entity_type: 'item', entity_id: m.id }, order: [['created_at', 'DESC']] });
    return success(res, j);
  } catch (e) { return next(e); }
};

// ---- Create full item (auto code when blank) ----
const create = async (req, res, next) => {
  try {
    const body = coerce(req.body);
    if (!body.description) return error(res, 'description (item name) required', 422);
    if (!body.code) body.code = await nextNumber(req.user.organization_id, 'item');
    if (body.vat_rate_id) {
      const v = await VatRate.findOne({ where: { id: body.vat_rate_id, ...org(req) } });
      if (v) body.vat_pct = Number(v.rate);
    }
    const m = await Material.create({ ...body, ...org(req) });
    for (const p of (req.body.prices || []).slice(0, 50)) {
      if (!p.unit_price) continue;
      await ItemPrice.create({ ...p, material_id: m.id, ...org(req) });
    }
    for (const [i, s] of ((req.body.specs || []).slice(0, 100)).entries()) {
      if (!s.attr_name) continue;
      await ItemSpec.create({ attr_name: s.attr_name, attr_value: s.attr_value || null, sort_order: i, material_id: m.id, ...org(req) });
    }
    return success(res, m, 'Item created', 201);
  } catch (e) { return next(e); }
};

const update = async (req, res, next) => {
  try {
    const m = await findItem(req, req.params.id);
    if (!m) return error(res, 'Not found', 404);
    const body = coerce(req.body);
    delete body.code;
    if (body.vat_rate_id) {
      const v = await VatRate.findOne({ where: { id: body.vat_rate_id, ...org(req) } });
      if (v) body.vat_pct = Number(v.rate);
    }
    await m.update(body);
    return success(res, m, 'Item updated');
  } catch (e) { return next(e); }
};

// ---- Delete guard: blocks when referenced by procurement docs or holding stock ----
const remove = async (req, res, next) => {
  try {
    const m = await findItem(req, req.params.id);
    if (!m) return error(res, 'Not found', 404);
    const [po, grn, ind, stock] = await Promise.all([
      PurchaseOrderItem.count({ where: { ...org(req), material_code: m.code } }),
      GrnItem.count({ where: { ...org(req), material_code: m.code } }),
      MaterialIndentItem.count({ where: { ...org(req), material_code: m.code } }),
      SiteStock.sum('qty', { where: { ...org(req), material_code: m.code } }),
    ]);
    if (po + grn + ind > 0) return error(res, `Item is used in ${po + grn + ind} procurement line(s) — deactivate instead`, 422);
    if (Number(stock || 0) > 0.001) return error(res, 'Item holds stock — deactivate instead', 422);
    await ItemPrice.destroy({ where: { material_id: m.id } });
    await ItemSpec.destroy({ where: { material_id: m.id } });
    await Document.destroy({ where: { ...org(req), entity_type: 'item', entity_id: m.id } });
    await m.destroy();
    return success(res, null, 'Item deleted');
  } catch (e) { return next(e); }
};

// ---- Duplicate (new code, copies prices + specs) ----
const duplicate = async (req, res, next) => {
  const t = await Material.sequelize.transaction();
  try {
    const m = await Material.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [{ model: ItemPrice, as: 'prices' }, { model: ItemSpec, as: 'specs' }],
      transaction: t,
    });
    if (!m) { await t.rollback(); return error(res, 'Not found', 404); }
    const j = m.toJSON();
    const prices = j.prices || []; const specs = j.specs || [];
    delete j.id; delete j.created_at; delete j.updated_at; delete j.prices; delete j.specs;
    delete j.preferred_supplier; delete j.vat_rate;
    const copy = await Material.create({
      ...j, code: req.body.code || await nextNumber(req.user.organization_id, 'item', t),
      description: req.body.description || `${j.description} (Copy)`,
    }, { transaction: t });
    for (const p of prices) {
      const k = { ...p }; delete k.id; delete k.created_at; delete k.updated_at;
      await ItemPrice.create({ ...k, material_id: copy.id }, { transaction: t });
    }
    for (const s of specs) {
      const k = { ...s }; delete k.id; delete k.created_at; delete k.updated_at;
      await ItemSpec.create({ ...k, material_id: copy.id }, { transaction: t });
    }
    await t.commit();
    return success(res, copy, 'Item duplicated', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

// ---- Prices ----
const addPrice = async (req, res, next) => {
  try {
    const m = await findItem(req, req.params.id);
    if (!m) return error(res, 'Not found', 404);
    if (req.body.unit_price === undefined) return error(res, 'unit_price required', 422);
    const p = await ItemPrice.create({ ...req.body, material_id: m.id, ...org(req) });
    return success(res, p, 'Price added', 201);
  } catch (e) { return next(e); }
};
const updatePrice = async (req, res, next) => {
  try {
    const p = await ItemPrice.findOne({ where: { id: req.params.priceId, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    await p.update(req.body);
    return success(res, p, 'Price updated');
  } catch (e) { return next(e); }
};
const removePrice = async (req, res, next) => {
  try {
    const p = await ItemPrice.findOne({ where: { id: req.params.priceId, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    await p.destroy();
    return success(res, null, 'Price deleted');
  } catch (e) { return next(e); }
};

// ---- Specs ----
const addSpec = async (req, res, next) => {
  try {
    const m = await findItem(req, req.params.id);
    if (!m) return error(res, 'Not found', 404);
    if (!req.body.attr_name) return error(res, 'attr_name required', 422);
    const max = (await ItemSpec.max('sort_order', { where: { material_id: m.id } })) || 0;
    const s = await ItemSpec.create({ ...req.body, material_id: m.id, sort_order: req.body.sort_order ?? max + 1, ...org(req) });
    return success(res, s, 'Spec added', 201);
  } catch (e) { return next(e); }
};
const updateSpec = async (req, res, next) => {
  try {
    const s = await ItemSpec.findOne({ where: { id: req.params.specId, ...org(req) } });
    if (!s) return error(res, 'Not found', 404);
    await s.update(req.body);
    return success(res, s, 'Spec updated');
  } catch (e) { return next(e); }
};
const removeSpec = async (req, res, next) => {
  try {
    const s = await ItemSpec.findOne({ where: { id: req.params.specId, ...org(req) } });
    if (!s) return error(res, 'Not found', 404);
    await s.destroy();
    return success(res, null, 'Spec deleted');
  } catch (e) { return next(e); }
};

// ---- Paginated catalog (new UI) — legacy array list stays for dropdowns ----
const catalog = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.active === '1') where.is_active = true;
    if (req.query.category) where.category = req.query.category;
    if (req.query.is_service !== undefined) where.is_service = req.query.is_service === '1';
    if (req.query.is_sellable !== undefined) where.is_sellable = req.query.is_sellable === '1';
    if (req.query.is_purchasable !== undefined) where.is_purchasable = req.query.is_purchasable === '1';
    if (req.query.search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${req.query.search}%` } },
        { description: { [Op.like]: `%${req.query.search}%` } },
        { name_ar: { [Op.like]: `%${req.query.search}%` } },
        { barcode: { [Op.like]: `%${req.query.search}%` } },
        { manufacturer_part_no: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    const SORTABLE = ['code', 'description', 'category', 'unit', 'purchase_price', 'sell_price', 'last_rate', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'code';
    const sortDir = String(req.query.sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const { rows, count } = await Material.findAndCountAll({ where, limit, offset, order: [[sortBy, sortDir]], distinct: true });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

module.exports = {
  get, create, update, remove, duplicate, catalog,
  addPrice, updatePrice, removePrice, addSpec, updateSpec, removeSpec,
};
