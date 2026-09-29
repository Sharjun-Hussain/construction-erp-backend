const { Op } = require('sequelize');
const {
  Material, ItemPrice, ItemSpec, ItemUom, ItemStock, SiteStock, Document,
  PurchaseOrderItem, GrnItem, MaterialIndentItem, Supplier, VatRate,
} = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const { nextNumber } = require('./settingController');

const org = (req) => ({ organization_id: req.user.organization_id });
const NUMS = ['vat_pct', 'discount_pct', 'tolerance_pct', 'conversion_factor', 'weight_kg', 'length_m', 'width_m', 'height_m', 'max_qty', 'reorder_qty', 'min_qty', 'purchase_price', 'sell_price', 'last_rate', 'lead_time_days', 'shelf_life_days'];
const num = (v) => (v === '' || v === undefined || v === null ? v : Number(v));
const UOM_NUMS = ['conversion_to_base', 'markup_pct', 'purchase_price', 'cost_price', 'sales_price', 'limit_price'];
const uomNums = (b) => {
  const out = { ...b };
  for (const k of UOM_NUMS) if (out[k] !== undefined) out[k] = num(out[k]);
  // limit price follows cost when the item locks it to latest cost
  return out;
};
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
        { model: ItemUom, as: 'uoms' },
        { model: ItemStock, as: 'stocks' },
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
    let baseTaken = false, salesTaken = false, purchTaken = false;
    for (const p of (req.body.prices || []).slice(0, 50)) {
      if (!p.unit_price) continue;
      await ItemPrice.create({ ...p, material_id: m.id, ...org(req) });
    }
    for (const [i, s] of ((req.body.specs || []).slice(0, 100)).entries()) {
      if (!s.attr_name) continue;
      await ItemSpec.create({ attr_name: s.attr_name, attr_value: s.attr_value || null, sort_order: i, material_id: m.id, ...org(req) });
    }
    for (const u of (req.body.uoms || []).slice(0, 20)) {
      if (!u.uom) continue;
      const row = uomNums(u);
      if (body.limit_price_as_cost && row.cost_price !== undefined) row.limit_price = row.cost_price;
      if (row.is_base && baseTaken) row.is_base = false;
      if (row.is_base) baseTaken = true;
      if (row.is_default_sales && salesTaken) row.is_default_sales = false;
      if (row.is_default_sales) salesTaken = true;
      if (row.is_default_purchase && purchTaken) row.is_default_purchase = false;
      if (row.is_default_purchase) purchTaken = true;
      await ItemUom.create({ ...row, material_id: m.id, ...org(req) });
    }
    for (const s of (req.body.stocks || []).slice(0, 50)) {
      if (!s.warehouse || !(Number(s.qty) > 0)) continue;
      await ItemStock.create({ warehouse: s.warehouse, locator: s.locator || null, qty: Number(s.qty), uom: s.uom || null, material_id: m.id, ...org(req) });
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
    await ItemUom.destroy({ where: { material_id: m.id } });
    await ItemStock.destroy({ where: { material_id: m.id } });
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
      include: [{ model: ItemPrice, as: 'prices' }, { model: ItemSpec, as: 'specs' }, { model: ItemUom, as: 'uoms' }, { model: ItemStock, as: 'stocks' }],
      transaction: t,
    });
    if (!m) { await t.rollback(); return error(res, 'Not found', 404); }
    const j = m.toJSON();
    const prices = j.prices || []; const specs = j.specs || [];
    const uoms = j.uoms || []; const stocks = j.stocks || [];
    delete j.id; delete j.created_at; delete j.updated_at;
    delete j.prices; delete j.specs; delete j.uoms; delete j.stocks;
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
    for (const u of uoms) {
      const k = { ...u }; delete k.id; delete k.created_at; delete k.updated_at;
      await ItemUom.create({ ...k, material_id: copy.id }, { transaction: t });
    }
    for (const s of stocks) {
      const k = { ...s }; delete k.id; delete k.created_at; delete k.updated_at;
      await ItemStock.create({ ...k, material_id: copy.id }, { transaction: t });
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

// ---- UOM conversions ----
const addUom = async (req, res, next) => {
  const t = await ItemUom.sequelize.transaction();
  try {
    const m = await Material.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!m) { await t.rollback(); return error(res, 'Not found', 404); }
    if (!req.body.uom) { await t.rollback(); return error(res, 'uom required', 422); }
    const body = uomNums(req.body);
    if (m.limit_price_as_cost && body.cost_price !== undefined) body.limit_price = body.cost_price;
    if (body.is_base) await ItemUom.update({ is_base: false }, { where: { material_id: m.id }, transaction: t });
    if (body.is_default_sales) await ItemUom.update({ is_default_sales: false }, { where: { material_id: m.id }, transaction: t });
    if (body.is_default_purchase) await ItemUom.update({ is_default_purchase: false }, { where: { material_id: m.id }, transaction: t });
    const u = await ItemUom.create({ ...body, material_id: m.id, ...org(req) }, { transaction: t });
    await t.commit();
    return success(res, u, 'UOM added', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
const updateUom = async (req, res, next) => {
  const t = await ItemUom.sequelize.transaction();
  try {
    const u = await ItemUom.findOne({ where: { id: req.params.uomId, ...org(req) }, transaction: t });
    if (!u) { await t.rollback(); return error(res, 'Not found', 404); }
    const body = uomNums(req.body);
    const m = await Material.findOne({ where: { id: u.material_id, ...org(req) }, transaction: t });
    if (m?.limit_price_as_cost && body.cost_price !== undefined) body.limit_price = body.cost_price;
    if (body.is_base) await ItemUom.update({ is_base: false }, { where: { material_id: u.material_id }, transaction: t });
    if (body.is_default_sales) await ItemUom.update({ is_default_sales: false }, { where: { material_id: u.material_id }, transaction: t });
    if (body.is_default_purchase) await ItemUom.update({ is_default_purchase: false }, { where: { material_id: u.material_id }, transaction: t });
    await u.update(body, { transaction: t });
    await t.commit();
    return success(res, u, 'UOM updated');
  } catch (e) { await t.rollback(); return next(e); }
};
const removeUom = async (req, res, next) => {
  try {
    const u = await ItemUom.findOne({ where: { id: req.params.uomId, ...org(req) } });
    if (!u) return error(res, 'Not found', 404);
    if (u.is_base) return error(res, 'Base UOM cannot be removed — set another base first', 422);
    await u.destroy();
    return success(res, null, 'UOM deleted');
  } catch (e) { return next(e); }
};

// ---- Warehouse opening stock ----
const addStock = async (req, res, next) => {
  try {
    const m = await findItem(req, req.params.id);
    if (!m) return error(res, 'Not found', 404);
    if (!req.body.warehouse || !(Number(req.body.qty) > 0)) return error(res, 'warehouse and qty required', 422);
    const s = await ItemStock.create({ warehouse: req.body.warehouse, locator: req.body.locator || null, qty: Number(req.body.qty), uom: req.body.uom || m.unit, material_id: m.id, ...org(req) });
    return success(res, s, 'Opening stock added', 201);
  } catch (e) { return next(e); }
};
const removeStock = async (req, res, next) => {
  try {
    const s = await ItemStock.findOne({ where: { id: req.params.stockId, ...org(req) } });
    if (!s) return error(res, 'Not found', 404);
    await s.destroy();
    return success(res, null, 'Opening stock deleted');
  } catch (e) { return next(e); }
};

module.exports = {
  get, create, update, remove, duplicate, catalog,
  addPrice, updatePrice, removePrice, addSpec, updateSpec, removeSpec,
  addUom, updateUom, removeUom, addStock, removeStock,
};
