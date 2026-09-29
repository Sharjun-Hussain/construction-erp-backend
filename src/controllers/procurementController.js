const { Supplier, Material, MaterialIndent, MaterialIndentItem, SupplierQuotation, SupplierQuotationItem, PurchaseOrder, PurchaseOrderItem, Grn, GrnItem, SiteStock, Project } = require('../models');
const { success } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });

// ---- Suppliers & materials ----
const listSuppliers = async (req, res, next) => {
  try { return success(res, await Supplier.findAll({ where: org(req), order: [['name', 'ASC']] })); }
  catch (e) { return next(e); }
};
const createSupplier = async (req, res, next) => {
  try { return success(res, await Supplier.create({ ...req.body, ...org(req) }), 'Supplier created', 201); }
  catch (e) { return next(e); }
};
const listMaterials = async (req, res, next) => {
  try { return success(res, await Material.findAll({ where: org(req), order: [['code', 'ASC']] })); }
  catch (e) { return next(e); }
};
const createMaterial = async (req, res, next) => {
  try { return success(res, await Material.create({ ...req.body, ...org(req) }), 'Material created', 201); }
  catch (e) { return next(e); }
};

// ---- Indents ----
const listIndents = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await MaterialIndent.findAll({ where, include: [{ model: MaterialIndentItem, as: 'items' }, { model: Project, as: 'project', attributes: ['id', 'name', 'code'] }], order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};
const createIndent = async (req, res, next) => {
  try {
    const { nextNumber } = require('./settingController');
    if (!req.body.number) req.body.number = await nextNumber(req.user.organization_id, 'indent');
    const indent = await MaterialIndent.create({ ...req.body, ...org(req), created_by: req.user.id });
    if (Array.isArray(req.body.items)) {
      for (const it of req.body.items) await MaterialIndentItem.create({ ...it, indent_id: indent.id, ...org(req) });
    }
    return success(res, await MaterialIndent.findByPk(indent.id, { include: [{ model: MaterialIndentItem, as: 'items' }, { model: Project, as: 'project', attributes: ['id', 'name', 'code'] }] }), 'Indent created', 201);
  } catch (e) { return next(e); }
};
const indentDecision = async (req, res, next) => {
  try {
    const indent = await MaterialIndent.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!indent) return success(res, null, 'Not found', 404);
    await indent.update({ status: req.body.status === 'Rejected' ? 'Rejected' : 'Approved' });
    return success(res, indent, 'Indent ' + indent.status);
  } catch (e) { return next(e); }
};

// ---- Quotations + comparison ----
const listQuotations = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.indent_id ? { indent_id: req.query.indent_id } : {}) };
    return success(res, await SupplierQuotation.findAll({ where, include: [{ model: SupplierQuotationItem, as: 'items' }], order: [['total', 'ASC']] }));
  } catch (e) { return next(e); }
};
const createQuotation = async (req, res, next) => {
  try {
    const q = await SupplierQuotation.create({ ...req.body, ...org(req) });
    let sub = 0;
    if (Array.isArray(req.body.items)) {
      for (const it of req.body.items) {
        const qty = Number(it.qty || 0), rate = Number(it.unit_rate || 0);
        await SupplierQuotationItem.create({ ...it, quotation_id: q.id, ...org(req), amount: qty * rate });
        sub += qty * rate;
      }
    }
    const { getValue } = require('./settingController');
    const vatPct = Number((await getValue(req.user.organization_id, 'tax', 'vat_pct')) ?? 15);
    const vat = sub * vatPct / 100;
    await q.update({ subtotal: sub, vat_amount: vat, total: sub + vat });
    return success(res, await SupplierQuotation.findByPk(q.id, { include: [{ model: SupplierQuotationItem, as: 'items' }] }), 'Quotation created', 201);
  } catch (e) { return next(e); }
};
const selectQuotation = async (req, res, next) => {
  try {
    const q = await SupplierQuotation.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: SupplierQuotationItem, as: 'items' }] });
    if (!q) return success(res, null, 'Not found', 404);
    await SupplierQuotation.update({ status: 'Rejected' }, { where: { indent_id: q.indent_id, ...org(req) } });
    await q.update({ status: 'Selected' });
    // auto-create PO from selected quotation
    const { nextNumber } = require('./settingController');
    const po = await PurchaseOrder.create({
      ...org(req), project_id: q.project_id, supplier_id: q.supplier_id, indent_id: q.indent_id,
      quotation_id: q.id, number: req.body.po_number || await nextNumber(req.user.organization_id, 'po'), subtotal: q.subtotal, vat_amount: q.vat_amount, total: q.total,
    });
    for (const it of q.items) {
      await PurchaseOrderItem.create({ po_id: po.id, ...org(req), material_code: it.material_code, description: it.description, unit: it.unit, qty: it.qty, unit_rate: it.unit_rate, amount: it.amount });
    }
    if (q.indent_id) await MaterialIndent.update({ status: 'Ordered' }, { where: { id: q.indent_id } });
    return success(res, po, 'Quotation selected, PO created', 201);
  } catch (e) { return next(e); }
};

// ---- Purchase orders ----
const listPOs = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await PurchaseOrder.findAll({ where, include: [{ model: PurchaseOrderItem, as: 'items' }, { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'code', 'vat_number', 'phone'] }, { model: Project, as: 'project', attributes: ['id', 'name', 'code'] }], order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};
const createPO = async (req, res, next) => {
  try {
    const { nextNumber, getValue } = require('./settingController');
    const number = req.body.number || await nextNumber(req.user.organization_id, 'po');
    const vatPct = Number(req.body.vat_pct ?? (await getValue(req.user.organization_id, 'tax', 'vat_pct')) ?? 15);
    let subtotal = 0;
    const itemsData = req.body.items || [];
    for (const it of itemsData) {
      const qty = Number(it.qty || 0);
      const rate = Number(it.unit_rate || 0);
      subtotal += (qty * rate);
    }
    const vat_amount = (subtotal * vatPct) / 100;
    const total = subtotal + vat_amount;

    const po = await PurchaseOrder.create({
      ...org(req),
      project_id: req.body.project_id,
      supplier_id: req.body.supplier_id,
      indent_id: req.body.indent_id || null,
      quotation_id: req.body.quotation_id || null,
      number,
      date: req.body.date || new Date(),
      delivery_date: req.body.delivery_date || null,
      subtotal,
      vat_amount,
      total,
      notes: req.body.notes || null,
      status: req.body.status || 'Draft',
    });

    for (const it of itemsData) {
      const qty = Number(it.qty || 0);
      const rate = Number(it.unit_rate || 0);
      await PurchaseOrderItem.create({
        ...org(req),
        po_id: po.id,
        material_code: it.material_code,
        description: it.description,
        unit: it.unit || 'NOS',
        qty,
        unit_rate: rate,
        amount: qty * rate,
        received_qty: 0,
      });
    }

    const created = await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: PurchaseOrderItem, as: 'items' },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'code', 'vat_number', 'phone'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'code'] },
      ],
    });
    return success(res, created, 'Purchase Order created', 201);
  } catch (e) { return next(e); }
};
const approvePO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!po) return success(res, null, 'Not found', 404);
    await po.update({ status: 'Approved' });
    return success(res, po, 'PO approved');
  } catch (e) { return next(e); }
};

// ---- GRN + posting (3-way match + stock) ----
const listGRNs = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.po_id ? { po_id: req.query.po_id } : {}) };
    return success(res, await Grn.findAll({
      where,
      include: [
        { model: GrnItem, as: 'items' },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'code'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'code'] },
        { model: PurchaseOrder, as: 'po', attributes: ['id', 'number', 'total', 'status'] },
      ],
      order: [['created_at', 'DESC']],
    }));
  } catch (e) { return next(e); }
};
const createGRN = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ where: { id: req.body.po_id, ...org(req) }, include: [{ model: PurchaseOrderItem, as: 'items' }] });
    if (!po) return success(res, null, 'PO not found', 404);
    const grn = await Grn.create({ ...req.body, ...org(req), project_id: po.project_id, supplier_id: po.supplier_id });
    let total = 0;
    for (const it of (req.body.items || [])) {
      const poi = po.items.find((x) => x.id === it.po_item_id);
      if (!poi) continue;
      const over = Number(poi.received_qty || 0) + Number(it.qty || 0) - Number(poi.qty || 0);
      if (over > 0.001) return success(res, null, 'Over-receipt blocked for ' + poi.material_code + ' (3-way match)', 422);
      const amount = Number(it.qty) * Number(poi.unit_rate);
      await GrnItem.create({ grn_id: grn.id, ...org(req), po_item_id: poi.id, material_code: poi.material_code, qty: it.qty, unit_rate: poi.unit_rate, amount });
      total += amount;
    }
    await grn.update({ total });
    return success(res, await Grn.findByPk(grn.id, { include: [{ model: GrnItem, as: 'items' }] }), 'GRN created', 201);
  } catch (e) { return next(e); }
};
const postGRN = async (req, res, next) => {
  const t = await Grn.sequelize.transaction();
  try {
    const grn = await Grn.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: GrnItem, as: 'items' }], transaction: t });
    if (!grn) { await t.rollback(); return success(res, null, 'Not found', 404); }
    if (grn.status === 'Posted') { await t.rollback(); return success(res, grn, 'Already posted'); }
    for (const it of grn.items) {
      const poi = await PurchaseOrderItem.findByPk(it.po_item_id, { transaction: t });
      await poi.update({ received_qty: Number(poi.received_qty || 0) + Number(it.qty) }, { transaction: t });
      const [stock] = await SiteStock.findOrCreate({
        where: { organization_id: req.user.organization_id, project_id: grn.project_id, material_code: it.material_code },
        defaults: { organization_id: req.user.organization_id, project_id: grn.project_id, material_code: it.material_code, description: poi.description, unit: poi.unit || 'NOS', qty: 0 },
        transaction: t,
      });
      await stock.update({ qty: Number(stock.qty) + Number(it.qty) }, { transaction: t });
      await Material.update({ last_rate: it.unit_rate }, { where: { organization_id: req.user.organization_id, code: it.material_code }, transaction: t });
    }
    const po = await PurchaseOrder.findByPk(grn.po_id, { include: [{ model: PurchaseOrderItem, as: 'items' }], transaction: t });
    const allIn = po.items.every((x) => Number(x.received_qty) >= Number(x.qty) - 0.001);
    const anyIn = po.items.some((x) => Number(x.received_qty) > 0.001);
    await po.update({ status: allIn ? 'Received' : (anyIn ? 'PartiallyReceived' : po.status) }, { transaction: t });
    await grn.update({ status: 'Posted' }, { transaction: t });
    await t.commit();
    return success(res, grn, 'GRN posted, stock updated');
  } catch (e) { await t.rollback(); return next(e); }
};
const siteStock = async (req, res, next) => {
  try {
    const where = { ...org(req), ...(req.query.project_id ? { project_id: req.query.project_id } : {}) };
    return success(res, await SiteStock.findAll({ where, order: [['material_code', 'ASC']] }));
  } catch (e) { return next(e); }
};
const reorder = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const mats = await Material.findAll({ where: { ...org(req), is_active: true, min_qty: { [Op.gt]: 0 } } });
    const out = [];
    for (const m of mats) {
      const stocks = await SiteStock.findAll({ where: { ...org(req), material_code: m.code } });
      const onhand = stocks.reduce((s, x) => s + Number(x.qty || 0), 0);
      const shortage = Number(m.min_qty) - onhand;
      if (shortage > 0.001) out.push({ material_code: m.code, description: m.description, unit: m.unit, min_qty: Number(m.min_qty), onhand: +onhand.toFixed(3), shortage: +shortage.toFixed(3), last_rate: Number(m.last_rate || 0) });
    }
    return success(res, out.sort((a, b) => b.shortage - a.shortage));
  } catch (e) { return next(e); }
};

module.exports = {
  listSuppliers, createSupplier, listMaterials, createMaterial,
  listIndents, createIndent, indentDecision,
  listQuotations, createQuotation, selectQuotation,
  listPOs, createPO, approvePO, listGRNs, createGRN, postGRN, siteStock, reorder,
};
