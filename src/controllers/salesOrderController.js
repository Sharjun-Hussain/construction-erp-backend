const { SalesOrder, SalesOrderItem, Customer, Quotation, sequelize } = require('../models');
const { success, error, paginated } = require('../utils/responseHandler');
const { getPagination } = require('../utils/pagination');
const { nextNumber } = require('./settingController');
const { Op } = require('sequelize');

const org = (req) => ({ organization_id: req.user.organization_id });
const autoNo = async (req, key, t) => nextNumber(req.user.organization_id, key, t);

const listSalesOrders = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };

    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where[Op.or] = [
        { order_no: { [Op.like]: `%${req.query.search}%` } },
        { customer_name: { [Op.like]: `%${req.query.search}%` } },
        { customer_po_no: { [Op.like]: `%${req.query.search}%` } },
        { reference: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await SalesOrder.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email', 'credit_limit'] },
        { model: SalesOrderItem, as: 'items' },
      ],
    });

    return paginated(res, rows, count, page, limit);
  } catch (e) {
    return next(e);
  }
};

const getSalesOrder = async (req, res, next) => {
  try {
    const so = await SalesOrder.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Customer, as: 'customer' },
        { model: SalesOrderItem, as: 'items' },
        { model: Quotation, as: 'quotation', attributes: ['id', 'quotation_no', 'net_amount'] },
      ],
    });
    if (!so) return error(res, 'Sales Order not found', 404);
    return success(res, so);
  } catch (e) {
    return next(e);
  }
};

const createSalesOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const body = { ...req.body };
    if (!body.order_no) {
      try {
        body.order_no = await autoNo(req, 'so', t);
      } catch {
        const count = await SalesOrder.count({ where: org(req), transaction: t });
        body.order_no = `SO-${String(count + 1).padStart(4, '0')}`;
      }
    }

    if (body.customer_id && !body.customer_name) {
      const c = await Customer.findOne({ where: { id: body.customer_id, ...org(req) }, transaction: t });
      if (c) {
        body.customer_name = c.name;
        body.credit_limit = body.credit_limit || c.credit_limit || 0;
      }
    }

    const salesOrder = await SalesOrder.create(
      {
        ...body,
        ...org(req),
      },
      { transaction: t }
    );

    // Save line items
    if (body.items && Array.isArray(body.items) && body.items.length) {
      const lineRecords = body.items.map((it, idx) => ({
        organization_id: req.user.organization_id,
        sales_order_id: salesOrder.id,
        sl_no: idx + 1,
        po_sl_no: it.po_sl_no || it.poSlNo || String(idx + 1),
        item_name: it.item || it.item_name || 'Standard Item',
        warehouse: it.warehouse || 'Main Yard',
        quantity: parseFloat(it.quantity) || 1,
        uom: it.uom || 'NOS',
        unit_price: parseFloat(it.unitPrice || it.unit_price) || 0,
        discount: parseFloat(it.discount) || 0,
        discount_currency: it.discountCurrency || 'SAR',
        vat_type: String(it.vatType || it.vat_type || '15'),
        vat_amount: parseFloat(it.vatAmount || it.vat_amount) || 0,
        total_amount: parseFloat(it.totalAmount || it.total_amount) || 0,
        delivery_period: it.deliveryPeriod || it.delivery_period || 'As per schedule',
      }));
      await SalesOrderItem.bulkCreate(lineRecords, { transaction: t });
    }

    await t.commit();

    const created = await SalesOrder.findByPk(salesOrder.id, {
      include: [{ model: SalesOrderItem, as: 'items' }],
    });
    return success(res, created, 'Sales Order created successfully', 201);
  } catch (e) {
    await t.rollback();
    return next(e);
  }
};

const updateSalesOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const so = await SalesOrder.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!so) {
      await t.rollback();
      return error(res, 'Sales Order not found', 404);
    }

    await so.update(req.body, { transaction: t });

    if (req.body.items && Array.isArray(req.body.items)) {
      await SalesOrderItem.destroy({ where: { sales_order_id: so.id }, transaction: t });
      const lineRecords = req.body.items.map((it, idx) => ({
        organization_id: req.user.organization_id,
        sales_order_id: so.id,
        sl_no: idx + 1,
        po_sl_no: it.po_sl_no || it.poSlNo || String(idx + 1),
        item_name: it.item || it.item_name || 'Standard Item',
        warehouse: it.warehouse || 'Main Yard',
        quantity: parseFloat(it.quantity) || 1,
        uom: it.uom || 'NOS',
        unit_price: parseFloat(it.unitPrice || it.unit_price) || 0,
        discount: parseFloat(it.discount) || 0,
        discount_currency: it.discountCurrency || 'SAR',
        vat_type: String(it.vatType || it.vat_type || '15'),
        vat_amount: parseFloat(it.vatAmount || it.vat_amount) || 0,
        total_amount: parseFloat(it.totalAmount || it.total_amount) || 0,
        delivery_period: it.deliveryPeriod || it.delivery_period || 'As per schedule',
      }));
      await SalesOrderItem.bulkCreate(lineRecords, { transaction: t });
    }

    await t.commit();
    const updated = await SalesOrder.findByPk(so.id, {
      include: [{ model: SalesOrderItem, as: 'items' }],
    });
    return success(res, updated, 'Sales Order updated successfully');
  } catch (e) {
    await t.rollback();
    return next(e);
  }
};

const deleteSalesOrder = async (req, res, next) => {
  try {
    const so = await SalesOrder.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!so) return error(res, 'Sales Order not found', 404);
    await SalesOrderItem.destroy({ where: { sales_order_id: so.id } });
    await so.destroy();
    return success(res, null, 'Sales Order deleted successfully');
  } catch (e) {
    return next(e);
  }
};

module.exports = {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
};
