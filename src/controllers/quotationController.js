const { Quotation, QuotationItem, Customer, Enquiry, Proposal, sequelize } = require('../models');
const { success, error, paginated } = require('../utils/responseHandler');
const { getPagination } = require('../utils/pagination');
const { nextNumber } = require('./settingController');
const { Op } = require('sequelize');

const org = (req) => ({ organization_id: req.user.organization_id });
const autoNo = async (req, key, t) => nextNumber(req.user.organization_id, key, t);

const listQuotations = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };

    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where[Op.or] = [
        { quotation_no: { [Op.like]: `%${req.query.search}%` } },
        { customer_name: { [Op.like]: `%${req.query.search}%` } },
        { reference: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await Quotation.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
        { model: QuotationItem, as: 'items' },
      ],
    });

    return paginated(res, rows, count, page, limit);
  } catch (e) {
    return next(e);
  }
};

const getQuotation = async (req, res, next) => {
  try {
    const q = await Quotation.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Customer, as: 'customer' },
        { model: QuotationItem, as: 'items' },
        { model: Enquiry, as: 'enquiry', attributes: ['id', 'number', 'title'] },
      ],
    });
    if (!q) return error(res, 'Quotation not found', 404);
    return success(res, q);
  } catch (e) {
    return next(e);
  }
};

const createQuotation = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const body = { ...req.body };
    if (!body.quotation_no) {
      try {
        body.quotation_no = await autoNo(req, 'quotation', t);
      } catch {
        const count = await Quotation.count({ where: org(req), transaction: t });
        body.quotation_no = `QTN-${String(count + 1).padStart(4, '0')}`;
      }
    }

    if (body.customer_id && !body.customer_name) {
      const c = await Customer.findOne({ where: { id: body.customer_id, ...org(req) }, transaction: t });
      if (c) body.customer_name = c.name;
    }

    const quotation = await Quotation.create(
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
        quotation_id: quotation.id,
        sl_no: idx + 1,
        item_name: it.item || it.item_name || 'Standard Item',
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
      await QuotationItem.bulkCreate(lineRecords, { transaction: t });
    }

    // Mirror to proposals
    try {
      await Proposal.create(
        {
          organization_id: req.user.organization_id,
          number: quotation.quotation_no,
          revision: quotation.revision,
          title: quotation.reference || `Quotation for ${quotation.customer_name}`,
          client_name: quotation.customer_name,
          customer_id: quotation.customer_id,
          enquiry_id: quotation.enquiry_id,
          amount: quotation.net_amount || quotation.total_amount,
          subtotal: quotation.total_amount,
          vat_amount: quotation.total_vat,
          vat_exempt: quotation.vat_exempt,
          discount_amount: quotation.discount_amount,
          round_off: quotation.round_off,
          delivery_period: quotation.delivery_period,
          delivery_method: quotation.delivery_method,
          payment_terms: quotation.payment_terms,
          salesman: quotation.salesman,
          cost_center: quotation.cost_center,
          bank_account: quotation.company_bank_account,
          shipping_address: quotation.shipping_address,
          notes: quotation.notes,
          valid_until: quotation.expiry_date,
          status: quotation.status,
          items: body.items || [],
        },
        { transaction: t }
      );
    } catch (pe) {
      console.warn('Could not mirror proposal:', pe.message);
    }

    await t.commit();

    const created = await Quotation.findByPk(quotation.id, {
      include: [{ model: QuotationItem, as: 'items' }],
    });
    return success(res, created, 'Quotation created successfully', 201);
  } catch (e) {
    await t.rollback();
    return next(e);
  }
};

const updateQuotation = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const q = await Quotation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!q) {
      await t.rollback();
      return error(res, 'Quotation not found', 404);
    }

    await q.update(req.body, { transaction: t });

    if (req.body.items && Array.isArray(req.body.items)) {
      await QuotationItem.destroy({ where: { quotation_id: q.id }, transaction: t });
      const lineRecords = req.body.items.map((it, idx) => ({
        organization_id: req.user.organization_id,
        quotation_id: q.id,
        sl_no: idx + 1,
        item_name: it.item || it.item_name || 'Standard Item',
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
      await QuotationItem.bulkCreate(lineRecords, { transaction: t });
    }

    await t.commit();
    const updated = await Quotation.findByPk(q.id, {
      include: [{ model: QuotationItem, as: 'items' }],
    });
    return success(res, updated, 'Quotation updated successfully');
  } catch (e) {
    await t.rollback();
    return next(e);
  }
};

const deleteQuotation = async (req, res, next) => {
  try {
    const q = await Quotation.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!q) return error(res, 'Quotation not found', 404);
    await QuotationItem.destroy({ where: { quotation_id: q.id } });
    await q.destroy();
    return success(res, null, 'Quotation deleted successfully');
  } catch (e) {
    return next(e);
  }
};

module.exports = {
  listQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
};
