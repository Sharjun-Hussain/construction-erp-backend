const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  Enquiry, SiteInspection, Proposal, Tender, Estimation, EstimationItem,
  Project, Boq, BoqItem, Customer, Document,
} = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const { nextNumber } = require('./settingController');

const org = (req) => ({ organization_id: req.user.organization_id });
const r2 = (n) => +Number(n || 0).toFixed(2);
const autoNo = async (req, key, t) => nextNumber(req.user.organization_id, key, t);

// ================= Enquiries =================
const ENQ_FLOW = { New: ['UnderReview', 'Dropped'], UnderReview: ['Inspected', 'Estimated', 'Dropped'], Inspected: ['Estimated', 'Dropped'], Estimated: ['Quoted', 'Dropped'], Quoted: ['Won', 'Lost'], Won: [], Lost: [], Dropped: [] };

const listEnquiries = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.source) where.source = req.query.source;
    if (req.query.search) {
      where[Op.or] = [{ number: { [Op.like]: `%${req.query.search}%` } }, { title: { [Op.like]: `%${req.query.search}%` } }, { client_name: { [Op.like]: `%${req.query.search}%` } }];
    }
    const SORTABLE = ['number', 'title', 'est_value', 'due_date', 'received_date', 'status', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { rows, count } = await Enquiry.findAndCountAll({
      where, limit, offset, order: [[sortBy, sortDir]], distinct: true,
      include: [{ model: SiteInspection, as: 'inspections', attributes: ['id', 'status', 'recommendation'] }],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const getEnquiry = async (req, res, next) => {
  try {
    const e = await Enquiry.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: SiteInspection, as: 'inspections' },
        { model: Tender, as: 'tender', attributes: ['id', 'number', 'status', 'bid_amount'] },
        { model: Customer, as: 'client', attributes: ['id', 'name'] },
      ],
    });
    if (!e) return error(res, 'Not found', 404);
    const docs = await Document.findAll({ where: { ...org(req), entity_type: 'enquiry', entity_id: e.id }, order: [['created_at', 'DESC']] });
    const j = e.toJSON();
    j.documents = docs;
    j.allowed_transitions = ENQ_FLOW[j.status] || [];
    return success(res, j);
  } catch (e) { return next(e); }
};

const createEnquiry = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'enquiry');
    if (body.client_id && !body.client_name) {
      const c = await Customer.findOne({ where: { id: body.client_id, ...org(req) } });
      if (c) body.client_name = c.name;
    }
    const e = await Enquiry.create({ ...body, ...org(req) });
    return success(res, e, 'Enquiry registered', 201);
  } catch (e) { return next(e); }
};

const updateEnquiry = async (req, res, next) => {
  try {
    const e = await Enquiry.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!e) return error(res, 'Not found', 404);
    const body = { ...req.body };
    if (body.client_id && !body.client_name) {
      const c = await Customer.findOne({ where: { id: body.client_id, ...org(req) } });
      if (c) body.client_name = c.name;
    }
    delete body.id;
    delete body.organization_id;
    delete body.number;
    delete body.tender_id;
    await e.update(body);
    return success(res, e, 'Enquiry updated successfully');
  } catch (e) { return next(e); }
};

const transitionEnquiry = async (req, res, next) => {
  try {
    const e = await Enquiry.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!e) return error(res, 'Not found', 404);
    if (!(ENQ_FLOW[e.status] || []).includes(req.body.status)) return error(res, `Cannot move enquiry from ${e.status} to ${req.body.status}`, 422);
    if (req.body.status === 'Lost' && !req.body.reason_lost) return error(res, 'reason_lost required', 422);
    await e.update({ status: req.body.status, reason_lost: req.body.reason_lost || e.reason_lost || null });
    return success(res, e, 'Enquiry ' + e.status);
  } catch (e) { return next(e); }
};

// Enquiry -> Project + Tender (creates the bidding workspace in one shot)
const convertEnquiry = async (req, res, next) => {
  const t = await Enquiry.sequelize.transaction();
  try {
    const e = await Enquiry.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!e) { await t.rollback(); return error(res, 'Not found', 404); }
    if (e.tender_id) { await t.rollback(); return error(res, 'Enquiry already converted', 422); }
    if (['Dropped', 'Lost'].includes(e.status)) { await t.rollback(); return error(res, 'Cannot convert a ' + e.status + ' enquiry', 422); }

    const proj = await Project.create({
      ...org(req),
      code: req.body.project_code || await autoNo(req, 'project', t),
      name: req.body.project_name || e.title,
      client_id: e.client_id || null, client_name: e.client_name || null,
      status: 'Tender', contract_value: Number(e.est_value || 0), currency: e.currency || 'SAR',
    }, { transaction: t });
    const heads = ['Material', 'Labor', 'Equipment', 'Subcontract', 'Overhead'];
    const { ProjectBudget } = require('../models');
    for (const head of heads) await ProjectBudget.create({ ...org(req), project_id: proj.id, head, budgeted: 0 }, { transaction: t });

    const tdr = await Tender.create({
      ...org(req), project_id: proj.id,
      number: req.body.tender_number || await autoNo(req, 'tender', t),
      title: e.title, client_id: e.client_id || null, client_name: e.client_name || null,
      bid_amount: Number(e.est_value || 0), currency: e.currency || 'SAR',
      issue_date: new Date(), submission_deadline: e.due_date || null,
      status: 'Draft',
    }, { transaction: t });

    await e.update({ tender_id: tdr.id, status: ['Estimated', 'Quoted'].includes(e.status) ? e.status : 'Estimated' }, { transaction: t });
    await t.commit();
    return success(res, { enquiry: e, project: proj, tender: tdr }, 'Enquiry converted — project and tender created', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

// ================= Site inspections =================
const listInspections = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.enquiry_id) where.enquiry_id = req.query.enquiry_id;
    if (req.query.project_id) where.project_id = req.query.project_id;
    const { rows, count } = await SiteInspection.findAndCountAll({
      where, limit, offset, order: [['visit_date', 'DESC']], distinct: true,
      include: [
        { model: Enquiry, as: 'enquiry', attributes: ['id', 'number', 'title'] },
        { model: Project, as: 'project', attributes: ['id', 'code', 'name'] },
      ],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const getInspection = async (req, res, next) => {
  try {
    const i = await SiteInspection.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [{ model: Enquiry, as: 'enquiry' }, { model: Project, as: 'project' }],
    });
    if (!i) return error(res, 'Not found', 404);
    const docs = await Document.findAll({ where: { ...org(req), entity_type: 'inspection', entity_id: i.id }, order: [['created_at', 'DESC']] });
    const j = i.toJSON(); j.documents = docs;
    return success(res, j);
  } catch (e) { return next(e); }
};

const createInspection = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'inspection');
    if (!body.visit_date) return error(res, 'visit_date required', 422);
    const i = await SiteInspection.create({ ...body, ...org(req) });
    if (i.enquiry_id && i.status === 'Completed') {
      const e = await Enquiry.findOne({ where: { id: i.enquiry_id, ...org(req) } });
      if (e && ['New', 'UnderReview'].includes(e.status)) await e.update({ status: 'Inspected' });
    }
    return success(res, i, 'Site inspection recorded', 201);
  } catch (e) { return next(e); }
};

const completeInspection = async (req, res, next) => {
  try {
    const i = await SiteInspection.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!i) return error(res, 'Not found', 404);
    await i.update({ status: 'Completed', ...req.body });
    if (i.enquiry_id) {
      const e = await Enquiry.findOne({ where: { id: i.enquiry_id, ...org(req) } });
      if (e && ['New', 'UnderReview'].includes(e.status)) await e.update({ status: 'Inspected' });
    }
    return success(res, i, 'Inspection completed');
  } catch (e) { return next(e); }
};

// ================= Proposals =================
const PROP_FLOW = { Draft: ['Sent'], Sent: ['Accepted', 'Rejected', 'Expired'], Accepted: [], Rejected: [], Expired: [] };

const listProposals = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.tender_id) where.tender_id = req.query.tender_id;
    if (req.query.search) {
      where[Op.or] = [{ number: { [Op.like]: `%${req.query.search}%` } }, { title: { [Op.like]: `%${req.query.search}%` } }, { client_name: { [Op.like]: `%${req.query.search}%` } }];
    }
    const { rows, count } = await Proposal.findAndCountAll({
      where, limit, offset, order: [['created_at', 'DESC']], distinct: true,
      include: [{ model: Tender, as: 'tender', attributes: ['id', 'number', 'status'] }],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const getProposal = async (req, res, next) => {
  try {
    const p = await Proposal.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Tender, as: 'tender' },
        { model: Estimation, as: 'estimation' },
        { model: Enquiry, as: 'enquiry', attributes: ['id', 'number', 'title'] },
      ],
    });
    if (!p) return error(res, 'Not found', 404);
    let lines = [];
    if (p.estimation_id) {
      lines = await EstimationItem.findAll({ where: { estimation_id: p.estimation_id, ...org(req) }, order: [['sort_order', 'ASC']] });
    } else if (p.tender_id) {
      const { TenderBaselineItem } = require('../models');
      lines = await TenderBaselineItem.findAll({ where: { tender_id: p.tender_id, ...org(req) } });
    }
    const j = p.toJSON();
    j.lines = lines;
    j.allowed_transitions = PROP_FLOW[j.status] || [];
    return success(res, j);
  } catch (e) { return next(e); }
};

const createProposal = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'proposal');
    if (body.tender_id) {
      const tdr = await Tender.findOne({ where: { id: body.tender_id, ...org(req) } });
      if (!tdr) return error(res, 'Tender not found', 404);
      body.amount = body.amount || tdr.bid_amount;
      body.client_name = body.client_name || tdr.client_name;
      body.currency = body.currency || tdr.currency;
      body.estimation_id = body.estimation_id || tdr.estimation_id;
    }
    if (body.enquiry_id && !body.client_name) {
      const e = await Enquiry.findOne({ where: { id: body.enquiry_id, ...org(req) } });
      if (e) { body.client_name = body.client_name || e.client_name; body.title = body.title || e.title; }
    }
    if (body.validity_days && !body.valid_until) {
      const v = new Date(); v.setDate(v.getDate() + Number(body.validity_days));
      body.valid_until = v.toISOString().slice(0, 10);
    }
    const p = await Proposal.create({ ...body, ...org(req) });
    return success(res, p, 'Proposal created', 201);
  } catch (e) { return next(e); }
};

const updateProposal = async (req, res, next) => {
  try {
    const p = await Proposal.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    const body = { ...req.body };
    delete body.id;
    delete body.organization_id;
    delete body.number;
    delete body.revision;
    if (body.validity_days && !body.valid_until) {
      const v = new Date(); v.setDate(v.getDate() + Number(body.validity_days));
      body.valid_until = v.toISOString().slice(0, 10);
    }
    await p.update(body);
    return success(res, p, 'Proposal updated successfully');
  } catch (e) { return next(e); }
};

const transitionProposal = async (req, res, next) => {
  try {
    const p = await Proposal.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    if (!(PROP_FLOW[p.status] || []).includes(req.body.status)) return error(res, `Cannot move proposal from ${p.status} to ${req.body.status}`, 422);
    const patch = { status: req.body.status };
    if (req.body.status === 'Sent') patch.sent_at = new Date();
    await p.update(patch);
    return success(res, p, 'Proposal ' + p.status);
  } catch (e) { return next(e); }
};

const reviseProposal = async (req, res, next) => {
  try {
    const p = await Proposal.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!p) return error(res, 'Not found', 404);
    if (!['Sent', 'Accepted', 'Rejected', 'Expired'].includes(p.status)) return error(res, 'Only issued proposals can be revised', 422);
    const j = p.toJSON();
    delete j.id; delete j.created_at; delete j.updated_at;
    const copy = await Proposal.create({ ...j, revision: p.revision + 1, status: 'Draft', sent_at: null, ...req.body });
    return success(res, copy, 'Proposal revision created', 201);
  } catch (e) { return next(e); }
};

const exportProposal = async (req, res, next) => {
  try {
    const p = await Proposal.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [{ model: Estimation, as: 'estimation' }, { model: Tender, as: 'tender' }],
    });
    if (!p) return error(res, 'Not found', 404);
    const cover = [
      { Field: 'Proposal No', Value: `${p.number} Rev ${p.revision}` },
      { Field: 'Title', Value: p.title || '' },
      { Field: 'Client', Value: p.client_name || '' },
      { Field: 'Amount', Value: `${Number(p.amount || 0).toLocaleString()} ${p.currency}` },
      { Field: 'Valid Until', Value: p.valid_until || '' },
      { Field: 'Payment Terms', Value: p.payment_terms || '' },
      { Field: 'Delivery', Value: p.delivery_terms || '' },
      { Field: 'Exclusions', Value: p.exclusions || '' },
      { Field: 'Status', Value: p.status },
    ];
    let lines = [];
    if (p.estimation_id) {
      const items = await EstimationItem.findAll({ where: { estimation_id: p.estimation_id, ...org(req) }, order: [['sort_order', 'ASC']] });
      lines = items.map((i) => ({ Description: i.description, Unit: i.unit, Quantity: Number(i.quantity || 0), 'Unit Price': Number(i.unit_sell || 0), Total: Number(i.total_sell || 0) }));
    }
    if (lines.length) lines.push({ Description: 'TOTAL', Unit: '', Quantity: '', 'Unit Price': '', Total: Number(p.amount || 0) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cover), 'Proposal');
    if (lines.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines), 'Price Schedule');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Proposal-${p.number}-R${p.revision}.xlsx"`);
    return res.send(buf);
  } catch (e) { return next(e); }
};

module.exports = {
  listEnquiries, getEnquiry, createEnquiry, updateEnquiry, transitionEnquiry, convertEnquiry,
  listInspections, getInspection, createInspection, completeInspection,
  listProposals, getProposal, createProposal, updateProposal, transitionProposal, reviseProposal, exportProposal,
};
