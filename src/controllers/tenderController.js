const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  Tender, TenderAddendum, TenderHistory, TenderBaselineItem,
  Project, Boq, BoqItem, Estimation, EstimationItem, Customer, Document,
  ProjectBudget, Grn, ScCertificate,
} = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');

const org = (req) => ({ organization_id: req.user.organization_id });
const hist = (req, tenderId, action, detail, t) =>
  TenderHistory.create({ ...org(req), tender_id: tenderId, action, detail: detail || null, user_id: req.user.id, user_name: req.user.name }, { transaction: t });

const FLOW = {
  Draft: ['Submitted', 'Cancelled'],
  Submitted: ['Won', 'Lost', 'Cancelled'],
  Won: [],
  Lost: [],
  Cancelled: [],
};

const r2 = (n) => +Number(n || 0).toFixed(2);

// ---- Analytics helpers ----
const marginOf = (bid, cost) => {
  const b = Number(bid || 0), c = Number(cost || 0);
  if (!b) return 0;
  return +(((b - c) / b) * 100).toFixed(2);
};
const deadlineInfo = (t) => {
  if (!t.submission_deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(t.submission_deadline); d.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400000);
  return { days_remaining: days, overdue: days < 0, urgent: days >= 0 && days <= 5 };
};

// ---- List / Get ----
const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.contract_type) where.contract_type = req.query.contract_type;
    if (req.query.client_id) where.client_id = req.query.client_id;
    if (req.query.deadline) {
      // tenders with a deadline inside the next N days
      const until = new Date(); until.setDate(until.getDate() + Number(req.query.deadline));
      where.submission_deadline = { [Op.between]: [new Date(), until] };
    }
    if (req.query.search) {
      where[Op.or] = [
        { number: { [Op.like]: `%${req.query.search}%` } },
        { title: { [Op.like]: `%${req.query.search}%` } },
        { reference: { [Op.like]: `%${req.query.search}%` } },
        { client_name: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    const SORTABLE = ['number', 'title', 'bid_amount', 'cost_amount', 'margin_pct', 'status', 'submission_deadline', 'created_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { rows, count } = await Tender.findAndCountAll({
      where, limit, offset, order: [[sortBy, sortDir]], distinct: true,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'code'] },
        { model: Customer, as: 'client', attributes: ['id', 'name'] },
      ],
    });
    const data = rows.map((r) => {
      const j = r.toJSON();
      return { ...j, margin_pct: Number(j.margin_pct || 0), computed_margin_pct: marginOf(j.bid_amount, j.cost_amount), deadline: deadlineInfo(j) };
    });
    return paginated(res, data, count, page, limit);
  } catch (e) { return next(e); }
};

const get = async (req, res, next) => {
  try {
    const t = await Tender.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Project, as: 'project' },
        { model: Customer, as: 'client' },
        { model: Estimation, as: 'estimation' },
        { model: TenderAddendum, as: 'addenda' },
        { model: TenderHistory, as: 'history' },
        { model: TenderBaselineItem, as: 'baseline_items' },
      ],
    });
    if (!t) return error(res, 'Not found', 404);
    const docs = await Document.findAll({ where: { ...org(req), entity_type: 'tender', entity_id: t.id }, order: [['created_at', 'DESC']] });
    const j = t.toJSON();
    j.margin_pct = Number(j.margin_pct || 0);
    j.computed_margin_pct = marginOf(j.bid_amount, j.cost_amount);
    j.deadline = deadlineInfo(j);
    j.allowed_transitions = FLOW[j.status] || [];
    j.documents = docs;
    return success(res, j);
  } catch (e) { return next(e); }
};

// ---- Create / Update ----
const create = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.client_id && !body.client_name) {
      const c = await Customer.findOne({ where: { id: body.client_id, ...org(req) } });
      if (c) body.client_name = c.name;
    }
    if (body.project_id) {
      const p = await Project.findOne({ where: { id: body.project_id, ...org(req) } });
      if (!p) return error(res, 'Project not found', 404);
      if (p.status === 'Draft' && body.status !== 'Submitted') {
        await p.update({ status: 'Tender' });
      }
      if (!body.client_id && p.client_id) {
        body.client_id = p.client_id;
        body.client_name = p.client_name;
      }
      if (!body.consultant_name) body.consultant_name = p.consultant_name || null;
      if (!body.title) body.title = p.name;
    }
    const t = await Tender.create({ ...body, ...org(req) });
    if (t.bid_amount && !t.cost_amount && t.estimation_id) {
      const est = await Estimation.findOne({ where: { id: t.estimation_id, ...org(req) } });
      if (est) { await t.update({ cost_amount: est.total_cost, margin_pct: marginOf(t.bid_amount, est.total_cost) }); }
    }
    await hist(req, t.id, 'created', t.title || t.number);
    return success(res, t, 'Tender created', 201);
  } catch (e) { return next(e); }
};

const update = async (req, res, next) => {
  try {
    const t = await Tender.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!t) return error(res, 'Not found', 404);
    if (['Won', 'Lost', 'Cancelled'].includes(t.status)) return error(res, 'Closed tenders cannot be edited', 422);
    if (t.status === 'Submitted') return error(res, 'Submitted tenders are locked (baseline is frozen)', 422);
    const before = t.toJSON();
    const patch = { ...req.body };
    delete patch.status;
    if (patch.bid_amount !== undefined || patch.cost_amount !== undefined) {
      const bid = patch.bid_amount !== undefined ? Number(patch.bid_amount) : Number(before.bid_amount);
      const cost = patch.cost_amount !== undefined ? Number(patch.cost_amount) : Number(before.cost_amount);
      patch.margin_pct = marginOf(bid, cost);
    }
    await t.update(patch);
    await hist(req, t.id, 'updated', Object.keys(req.body).join(', '));
    return success(res, t, 'Tender updated');
  } catch (e) { return next(e); }
};

const remove = async (req, res, next) => {
  try {
    const t = await Tender.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!t) return error(res, 'Not found', 404);
    if (t.status !== 'Draft') return error(res, 'Only Draft tenders can be deleted', 422);
    await TenderAddendum.destroy({ where: { tender_id: t.id } });
    await TenderBaselineItem.destroy({ where: { tender_id: t.id } });
    await TenderHistory.destroy({ where: { tender_id: t.id } });
    await Document.destroy({ where: { ...org(req), entity_type: 'tender', entity_id: t.id } });
    await t.destroy();
    return success(res, null, 'Tender deleted');
  } catch (e) { return next(e); }
};

// ---- Baseline freeze (on submit) ----
const freezeBaseline = async (req, res, next) => {
  const t = await Tender.sequelize.transaction();
  try {
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!tdr) { await t.rollback(); return error(res, 'Not found', 404); }
    if (tdr.baseline_frozen_at) { await t.rollback(); return error(res, 'Baseline already frozen', 422); }

    const lines = [];
    if (tdr.estimation_id) {
      const items = await EstimationItem.findAll({ where: { estimation_id: tdr.estimation_id, ...org(req) }, transaction: t });
      for (const i of items) {
        const qty = Number(i.quantity || 0), cost = Number(i.unit_cost || 0);
        lines.push({
          boq_item_id: i.boq_item_id || null, line_no: null, description: i.description,
          unit: i.unit, division: null, quantity: qty,
          unit_rate: Number(i.unit_sell || 0), amount: r2(qty * Number(i.unit_sell || 0)),
          cost_rate: cost, cost_amount: r2(qty * cost),
        });
      }
    }
    // project BOQ lines provide quantity x rate when no estimation is linked
    if (!lines.length) {
      const boq = await Boq.findOne({
        where: { project_id: tdr.project_id, status: { [Op.in]: ['Approved', 'Submitted'] }, ...org(req) },
        order: [['revision', 'DESC']], include: [{ model: BoqItem, as: 'items' }], transaction: t,
      });
      if (boq) {
        for (const i of (boq.items || [])) {
          const qty = Number(i.quantity || 0), cost = Number(i.cost_rate || 0);
          lines.push({
            boq_item_id: i.id, line_no: i.line_no, description: i.description, unit: i.unit, division: i.division,
            quantity: qty, unit_rate: Number(i.unit_rate || 0), amount: Number(i.amount || 0),
            cost_rate: cost, cost_amount: r2(qty * cost),
          });
        }
      }
    }
    for (const l of lines) await TenderBaselineItem.create({ ...l, ...org(req), tender_id: tdr.id }, { transaction: t });

    const bid = Number(tdr.bid_amount || 0);
    const cost = Number(tdr.cost_amount || 0) || lines.reduce((s, l) => s + Number(l.cost_amount || 0), 0);
    const cont = bid * (Number(tdr.contingency_pct || 0) / 100);
    const esc = bid * (Number(tdr.escalation_pct || 0) / 100);
    const totalCost = cost + cont + esc;
    await tdr.update({
      baseline_frozen_at: new Date(),
      cost_amount: r2(totalCost),
      bid_amount: bid || r2(lines.reduce((s, l) => s + Number(l.amount || 0), 0)),
      margin_pct: marginOf(bid || lines.reduce((s, l) => s + Number(l.amount || 0), 0), totalCost),
    }, { transaction: t });
    await hist(req, tdr.id, 'baseline_frozen', `${lines.length} lines — cost ${r2(totalCost)}`, t);
    await t.commit();
    return success(res, { lines: lines.length, cost_amount: r2(totalCost), margin_pct: marginOf(bid, totalCost) }, 'Cost baseline frozen');
  } catch (e) { await t.rollback(); return next(e); }
};

// ---- Lifecycle ----
const submit = async (req, res, next) => {
  const t = await Tender.sequelize.transaction();
  try {
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!tdr) { await t.rollback(); return error(res, 'Not found', 404); }
    if (!(FLOW[tdr.status] || []).includes('Submitted')) { await t.rollback(); return error(res, `Cannot submit from ${tdr.status}`, 422); }
    if (tdr.submission_deadline && new Date(tdr.submission_deadline) < new Date(new Date().toDateString())) {
      await t.rollback(); return error(res, 'Submission deadline has passed', 422);
    }
    await tdr.update({ status: 'Submitted', submitted_at: new Date() }, { transaction: t });
    await hist(req, tdr.id, 'submitted', tdr.number, t);
    await t.commit();
    if (!tdr.baseline_frozen_at) return freezeBaseline(req, res, next);
    return success(res, tdr, 'Tender submitted');
  } catch (e) { await t.rollback(); return next(e); }
};

const decision = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Won', 'Lost', 'Cancelled'].includes(status)) return error(res, 'status must be Won|Lost|Cancelled', 422);
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!tdr) return error(res, 'Not found', 404);
    if (!(FLOW[tdr.status] || []).includes(status)) return error(res, `Cannot move tender from ${tdr.status} to ${status}`, 422);
    if (status === 'Lost' && !req.body.reason_lost) return error(res, 'reason_lost is required when a tender is lost', 422);
    const patch = { status, reason_lost: req.body.reason_lost || tdr.reason_lost || null };
    if (status === 'Won') patch.awarded_at = new Date();
    if (status === 'Won') {
      const proj = await Project.findOne({ where: { id: tdr.project_id, ...org(req) } });
      if (proj) {
        await proj.update({
          status: 'Awarded',
          contract_value: Number(tdr.bid_amount || 0) || proj.contract_value,
          currency: tdr.currency || proj.currency,
          contract_no: tdr.reference || proj.contract_no,
        });
      }
    }
    await tdr.update(patch);
    await hist(req, tdr.id, status.toLowerCase(), req.body.reason_lost || `Bid ${tdr.bid_amount} ${tdr.currency}`);
    return success(res, tdr, 'Tender ' + status);
  } catch (e) { return next(e); }
};

// ---- Award conversion: tender -> project + BOQ + baseline ----
const convertToProject = async (req, res, next) => {
  const t = await Tender.sequelize.transaction();
  try {
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!tdr) { await t.rollback(); return error(res, 'Not found', 404); }
    if (tdr.status !== 'Won') { await t.rollback(); return error(res, 'Only Won tenders can be converted to a project', 422); }
    if (tdr.awarded_project_id) { await t.rollback(); return error(res, 'Tender already converted', 422); }

    const proj = await Project.findOne({ where: { id: tdr.project_id, ...org(req) }, transaction: t });
    if (!proj) { await t.rollback(); return error(res, 'Tender project not found', 404); }
    await proj.update({
      status: 'InProgress',
      contract_value: Number(tdr.bid_amount || 0) || proj.contract_value,
      currency: tdr.currency || proj.currency,
      contract_no: tdr.reference || proj.contract_no,
      client_id: tdr.client_id || proj.client_id,
      client_name: tdr.client_name || proj.client_name,
    }, { transaction: t });

    const { nextNumber } = require('./settingController');
    const boqNumber = req.body.boq_number || await nextNumber(req.user.organization_id, 'boq', t);
    const boq = await Boq.create({
      ...org(req), project_id: proj.id, number: boqNumber,
      title: req.body.boq_title || `Awarded BOQ — ${tdr.title || tdr.number}`,
      revision: 1, status: 'Draft', total_amount: Number(tdr.bid_amount || 0),
    }, { transaction: t });

    const base = await TenderBaselineItem.findAll({ where: { tender_id: tdr.id, ...org(req) }, transaction: t });
    let total = 0, sort = 0;
    for (const b of base) {
      const amount = r2(Number(b.quantity || 0) * Number(b.unit_rate || 0));
      total += amount;
      await BoqItem.create({
        ...org(req), boq_id: boq.id, line_no: b.line_no || `L${sort + 1}`, description: b.description,
        unit: b.unit, division: b.division, quantity: b.quantity, unit_rate: b.unit_rate,
        cost_rate: b.cost_rate, amount, sort_order: ++sort,
      }, { transaction: t });
    }
    await boq.update({ total_amount: r2(total) }, { transaction: t });
    await tdr.update({ awarded_project_id: proj.id }, { transaction: t });
    await hist(req, tdr.id, 'converted', `Project ${proj.code} · BOQ ${boqNumber} · ${base.length} lines`, t);
    await t.commit();
    return success(res, { project: proj, boq, lines: base.length }, 'Tender converted to project and BOQ', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

// ---- Addenda / clarifications ----
const listAddenda = async (req, res, next) => {
  try {
    return success(res, await TenderAddendum.findAll({ where: { tender_id: req.params.id, ...org(req) }, order: [['ref_no', 'ASC']] }));
  } catch (e) { return next(e); }
};
const addAddendum = async (req, res, next) => {
  try {
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!tdr) return error(res, 'Not found', 404);
    const max = (await TenderAddendum.max('ref_no', { where: { tender_id: tdr.id } })) || 0;
    const a = await TenderAddendum.create({ ...req.body, tender_id: tdr.id, ref_no: req.body.ref_no || max + 1, ...org(req) });
    await hist(req, tdr.id, 'addendum', `${a.type} #${a.ref_no}${a.subject ? ' — ' + a.subject : ''}`);
    return success(res, a, 'Addendum added', 201);
  } catch (e) { return next(e); }
};
const answerAddendum = async (req, res, next) => {
  try {
    const a = await TenderAddendum.findOne({ where: { id: req.params.addendumId, tender_id: req.params.id, ...org(req) } });
    if (!a) return error(res, 'Not found', 404);
    await a.update({ response: req.body.response, responded_date: req.body.responded_date || new Date(), status: 'Answered' });
    await hist(req, req.params.id, 'clarification_answered', `#${a.ref_no}`);
    return success(res, a, 'Clarification answered');
  } catch (e) { return next(e); }
};
const removeAddendum = async (req, res, next) => {
  try {
    const a = await TenderAddendum.findOne({ where: { id: req.params.addendumId, tender_id: req.params.id, ...org(req) } });
    if (!a) return error(res, 'Not found', 404);
    await a.destroy();
    return success(res, null, 'Addendum deleted');
  } catch (e) { return next(e); }
};

// ---- Documents ----
const listDocs = async (req, res, next) => {
  try {
    return success(res, await Document.findAll({ where: { ...org(req), entity_type: 'tender', entity_id: req.params.id }, order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};

// ---- Analysis ----
const summary = async (req, res, next) => {
  try {
    const all = await Tender.findAll({ where: { ...org(req) }, include: [{ model: Project, as: 'project', attributes: ['id', 'name', 'code'] }], order: [['created_at', 'DESC']] });
    const won = all.filter((t) => t.status === 'Won');
    const lost = all.filter((t) => t.status === 'Lost');
    const open = all.filter((t) => ['Draft', 'Submitted'].includes(t.status));
    const decided = won.length + lost.length;
    const sumBid = (a) => a.reduce((s, t) => s + Number(t.bid_amount || 0), 0);
    const sumCost = (a) => a.reduce((s, t) => s + Number(t.cost_amount || 0), 0);

    // bid vs actual margin variance on won tenders
    const projectIds = [...new Set(won.map((t) => t.project_id).filter(Boolean))];
    const [budgets, grns, certs] = await Promise.all([
      ProjectBudget.findAll({ where: { project_id: { [Op.in]: projectIds }, ...org(req) } }),
      Grn.findAll({ where: { project_id: { [Op.in]: projectIds }, ...org(req) } }),
      ScCertificate.findAll({ where: { project_id: { [Op.in]: projectIds }, ...org(req) } }),
    ]);
    const actualByProject = {};
    for (const p of projectIds) actualByProject[p] = 0;
    for (const g of grns) actualByProject[g.project_id] = (actualByProject[g.project_id] || 0) + Number(g.total || 0);
    for (const c of certs) actualByProject[c.project_id] = (actualByProject[c.project_id] || 0) + Number(c.gross || 0);
    for (const b of budgets) actualByProject[b.project_id] = (actualByProject[b.project_id] || 0) + Number(b.actual_manual || 0);

    const variances = won.map((t) => {
      const actualCost = actualByProject[t.project_id] || 0;
      const bidMargin = marginOf(t.bid_amount, t.cost_amount);
      const hasActuals = actualCost > 0;
      const actMargin = hasActuals ? marginOf(t.bid_amount, actualCost) : null;
      return {
        id: t.id, number: t.number, title: t.title, project: t.project?.code,
        bid_amount: Number(t.bid_amount || 0), bid_cost: Number(t.cost_amount || 0), actual_cost: +actualCost.toFixed(2),
        bid_margin_pct: bidMargin, actual_margin_pct: actMargin, variance: actMargin === null ? null : +(actMargin - bidMargin).toFixed(2),
        has_actuals: hasActuals,
      };
    });

    const byClient = {};
    for (const t of all) {
      const k = t.client_name || 'Unassigned';
      byClient[k] = byClient[k] || { client: k, total: 0, won: 0, lost: 0, open: 0, won_value: 0, bid_value: 0 };
      byClient[k].total += 1;
      byClient[k].bid_value += Number(t.bid_amount || 0);
      if (t.status === 'Won') { byClient[k].won += 1; byClient[k].won_value += Number(t.bid_amount || 0); }
      else if (t.status === 'Lost') byClient[k].lost += 1;
      else byClient[k].open += 1;
    }

    const byType = {};
    for (const t of all) {
      byType[t.contract_type] = byType[t.contract_type] || { contract_type: t.contract_type, total: 0, won: 0, value: 0 };
      byType[t.contract_type].total += 1;
      byType[t.contract_type].value += Number(t.bid_amount || 0);
      if (t.status === 'Won') byType[t.contract_type].won += 1;
    }

    const now = new Date(); now.setHours(0, 0, 0, 0);
    const pipeline = open.map((t) => {
      const d = deadlineInfo(t);
      return { id: t.id, number: t.number, title: t.title, project: t.project?.code, status: t.status, bid_amount: Number(t.bid_amount || 0), submission_deadline: t.submission_deadline, days_remaining: d?.days_remaining ?? null, probability: t.probability };
    }).sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999));

    const monthly = {};
    for (const t of all) {
      if (!t.submitted_at) continue;
      const k = new Date(t.submitted_at).toISOString().slice(0, 7);
      monthly[k] = monthly[k] || { month: k, submitted: 0, won: 0, lost: 0, value: 0, won_value: 0 };
      monthly[k].submitted += 1;
      monthly[k].value += Number(t.bid_amount || 0);
      if (t.status === 'Won') { monthly[k].won += 1; monthly[k].won_value += Number(t.bid_amount || 0); }
      if (t.status === 'Lost') monthly[k].lost += 1;
    }

    return success(res, {
      totals: {
        all: all.length, open: open.length, won: won.length, lost: lost.length,
        pipeline_value: +sumBid(open).toFixed(2),
        won_value: +sumBid(won).toFixed(2),
        win_rate_pct: decided ? +((won.length / decided) * 100).toFixed(1) : 0,
        avg_bid: all.length ? r2(sumBid(all) / all.length) : 0,
        avg_won_bid: won.length ? r2(sumBid(won) / won.length) : 0,
        won_value_weighted_pct: (sumBid(won) + sumBid(lost)) ? +((sumBid(won) / (sumBid(won) + sumBid(lost))) * 100).toFixed(1) : 0,
        portfolio_margin_pct: marginOf(sumBid(won), sumCost(won)),
      },
      pipeline,
      variances,
      by_client: Object.values(byClient).sort((a, b) => b.bid_value - a.bid_value),
      by_contract_type: Object.values(byType),
      monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
      bonds: all.filter((t) => t.bond_status && t.bond_status !== 'None' && t.bond_status !== 'Released').map((t) => ({ id: t.id, number: t.number, bond_type: t.bond_type, bond_amount: Number(t.bond_amount || 0), bond_expiry: t.bond_expiry, bond_status: t.bond_status })),
    });
  } catch (e) { return next(e); }
};

const costAnalysis = async (req, res, next) => {
  try {
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: TenderBaselineItem, as: 'baseline_items' }] });
    if (!tdr) return error(res, 'Not found', 404);
    const lines = (tdr.baseline_items || []).map((b) => {
      const qty = Number(b.quantity || 0), rate = Number(b.unit_rate || 0), cost = Number(b.cost_rate || 0);
      return {
        id: b.id, line_no: b.line_no, description: b.description, unit: b.unit, division: b.division,
        quantity: qty, unit_rate: rate, amount: r2(qty * rate), cost_rate: cost, cost_amount: r2(qty * cost),
        margin: r2(qty * (rate - cost)), margin_pct: rate ? +(((rate - cost) / rate) * 100).toFixed(1) : 0,
      };
    });
    const divs = {};
    for (const l of lines) {
      const d = l.division || 'Unassigned';
      divs[d] = divs[d] || { division: d, amount: 0, cost: 0, margin: 0, lines: 0 };
      divs[d].amount += l.amount; divs[d].cost += l.cost_amount; divs[d].margin += l.margin; divs[d].lines += 1;
    }
    const bid = Number(tdr.bid_amount || 0);
    const cost = Number(tdr.cost_amount || 0) || lines.reduce((s, l) => s + l.cost_amount, 0);
    const cont = bid * (Number(tdr.contingency_pct || 0) / 100);
    const esc = bid * (Number(tdr.escalation_pct || 0) / 100);
    return success(res, {
      lines,
      divisions: Object.values(divs).map((d) => ({ ...d, amount: r2(d.amount), cost: r2(d.cost), margin: r2(d.margin) })),
      summary: {
        bid_amount: bid, direct_cost: r2(cost), contingency: r2(cont), escalation: r2(esc),
        total_cost: r2(cost + cont + esc), margin: r2(bid - cost - cont - esc), margin_pct: marginOf(bid, cost + cont + esc),
        negative_lines: lines.filter((l) => l.margin < 0).length,
        currency: tdr.currency,
      },
    });
  } catch (e) { return next(e); }
};

const history = async (req, res, next) => {
  try {
    return success(res, await TenderHistory.findAll({ where: { tender_id: req.params.id, ...org(req) }, order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};

const exportXlsx = async (req, res, next) => {
  try {
    const tdr = await Tender.findOne({ where: { id: req.params.id, ...org(req) }, include: [{ model: TenderBaselineItem, as: 'baseline_items' }] });
    if (!tdr) return error(res, 'Not found', 404);
    const cover = [
      { Field: 'Tender No', Value: tdr.number }, { Field: 'Reference', Value: tdr.reference || '' },
      { Field: 'Title', Value: tdr.title || '' }, { Field: 'Client', Value: tdr.client_name || '' },
      { Field: 'Consultant', Value: tdr.consultant_name || '' }, { Field: 'Tender Type', Value: tdr.tender_type },
      { Field: 'Contract Type', Value: tdr.contract_type }, { Field: 'Currency', Value: tdr.currency },
      { Field: 'Issue Date', Value: tdr.issue_date || '' }, { Field: 'Submission Deadline', Value: tdr.submission_deadline || '' },
      { Field: 'Validity', Value: tdr.validity_date || '' }, { Field: 'Status', Value: tdr.status },
      { Field: 'Bid Amount', Value: Number(tdr.bid_amount || 0) }, { Field: 'Cost Amount', Value: Number(tdr.cost_amount || 0) },
      { Field: 'Margin %', Value: marginOf(tdr.bid_amount, tdr.cost_amount) },
      { Field: 'Bond Type', Value: tdr.bond_type || '' }, { Field: 'Bond Amount', Value: Number(tdr.bond_amount || 0) },
      { Field: 'Bond Expiry', Value: tdr.bond_expiry || '' },
    ];
    const lines = (tdr.baseline_items || []).map((b, i) => ({
      'Line No': b.line_no || i + 1, Description: b.description, Unit: b.unit, Division: b.division || '',
      Quantity: Number(b.quantity || 0), 'Unit Rate': Number(b.unit_rate || 0), Amount: Number(b.amount || 0),
      'Cost Rate': Number(b.cost_rate || 0), 'Cost Amount': Number(b.cost_amount || 0),
      Margin: r2(Number(b.amount || 0) - Number(b.cost_amount || 0)),
    }));
    lines.push({ 'Line No': '', Description: 'TOTAL', Unit: '', Division: '', Quantity: '', 'Unit Rate': '', Amount: Number(tdr.bid_amount || 0), 'Cost Rate': '', 'Cost Amount': Number(tdr.cost_amount || 0), Margin: r2(Number(tdr.bid_amount || 0) - Number(tdr.cost_amount || 0)) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cover), 'Tender');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines), 'BOQ');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Tender-${tdr.number}.xlsx"`);
    return res.send(buf);
  } catch (e) { return next(e); }
};

module.exports = {
  list, get, create, update, remove, submit, decision, freezeBaseline, convertToProject,
  listAddenda, addAddendum, answerAddendum, removeAddendum, listDocs,
  summary, costAnalysis, history, exportXlsx,
};
