const { Op } = require('sequelize');
const {
  LabourRequest, Equipment, EquipmentRequest, EquipmentTransfer, Job, Project,
} = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const { nextNumber } = require('./settingController');

const org = (req) => ({ organization_id: req.user.organization_id });
const autoNo = async (req, key, t) => nextNumber(req.user.organization_id, key, t);

// ================= Labour requests =================
const LAB_FLOW = { Requested: ['Approved', 'Cancelled'], Approved: ['Assigned', 'Cancelled'], Assigned: ['Fulfilled', 'Cancelled'], Fulfilled: [], Cancelled: [] };

const listLabour = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.trade) where.trade = { [Op.like]: `%${req.query.trade}%` };
    const { rows, count } = await LabourRequest.findAndCountAll({
      where, limit, offset, order: [['date_required', 'ASC']], distinct: true,
      include: [{ model: Project, as: 'project', attributes: ['id', 'code', 'name'] }],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const createLabour = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'labour');
    if (!body.project_id || !body.trade || !body.date_required) return error(res, 'project_id, trade and date_required required', 422);
    const r = await LabourRequest.create({ ...body, ...org(req) });
    return success(res, r, 'Labour request raised', 201);
  } catch (e) { return next(e); }
};

const transitionLabour = async (req, res, next) => {
  try {
    const r = await LabourRequest.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!r) return error(res, 'Not found', 404);
    if (!(LAB_FLOW[r.status] || []).includes(req.body.status)) return error(res, `Cannot move request from ${r.status} to ${req.body.status}`, 422);
    const patch = { status: req.body.status };
    if (req.body.qty_assigned !== undefined) patch.qty_assigned = Number(req.body.qty_assigned);
    if (req.body.status === 'Fulfilled' && patch.qty_assigned === undefined && Number(r.qty_assigned || 0) < Number(r.qty_requested || 0)) {
      return error(res, 'Cannot fulfil — assigned quantity is short', 422);
    }
    await r.update(patch);
    return success(res, r, 'Request ' + r.status);
  } catch (e) { return next(e); }
};

// ================= Equipment master =================
const listEquipment = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.category) where.category = req.query.category;
    if (req.query.project_id) where.current_project_id = req.query.project_id;
    if (req.query.search) {
      where[Op.or] = [{ code: { [Op.like]: `%${req.query.search}%` } }, { name: { [Op.like]: `%${req.query.search}%` } }, { plate_no: { [Op.like]: `%${req.query.search}%` } }];
    }
    const { rows, count } = await Equipment.findAndCountAll({
      where, limit, offset, order: [['code', 'ASC']], distinct: true,
      include: [{ model: Project, as: 'current_project', attributes: ['id', 'code', 'name'] }],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const createEquipment = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.code) body.code = await autoNo(req, 'equipment');
    if (!body.name) return error(res, 'name required', 422);
    if (body.current_project_id) body.status = 'OnSite';
    const e = await Equipment.create({ ...body, ...org(req) });
    return success(res, e, 'Equipment registered', 201);
  } catch (e) { return next(e); }
};

const updateEquipment = async (req, res, next) => {
  try {
    const e = await Equipment.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!e) return error(res, 'Not found', 404);
    await e.update(req.body);
    return success(res, e, 'Equipment updated');
  } catch (e) { return next(e); }
};

// ================= Equipment requests =================
const listEquipmentRequests = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await EquipmentRequest.findAndCountAll({
      where, limit, offset, order: [['date_required', 'ASC']], distinct: true,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'code', 'name'] },
        { model: Equipment, as: 'equipment', attributes: ['id', 'code', 'name', 'status'] },
      ],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const createEquipmentRequest = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'equipment');
    if (!body.project_id || !body.date_required) return error(res, 'project_id and date_required required', 422);
    const r = await EquipmentRequest.create({ ...body, ...org(req) });
    return success(res, r, 'Equipment request raised', 201);
  } catch (e) { return next(e); }
};

const transitionEquipmentRequest = async (req, res, next) => {
  const t = await EquipmentRequest.sequelize.transaction();
  try {
    const r = await EquipmentRequest.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!r) { await t.rollback(); return error(res, 'Not found', 404); }
    if (!(LAB_FLOW[r.status] || []).includes(req.body.status)) { await t.rollback(); return error(res, `Cannot move request from ${r.status} to ${req.body.status}`, 422); }
    const patch = { status: req.body.status };
    if (req.body.equipment_id) patch.equipment_id = req.body.equipment_id;
    if (req.body.status === 'Assigned') {
      const eq = await Equipment.findOne({ where: { id: patch.equipment_id || r.equipment_id, ...org(req) }, transaction: t });
      if (!eq) { await t.rollback(); return error(res, 'Assign an equipment unit first', 422); }
      if (!['Available', 'Idle'].includes(eq.status)) { await t.rollback(); return error(res, `Equipment ${eq.code} is ${eq.status}`, 422); }
      await eq.update({ status: 'OnSite', current_project_id: r.project_id }, { transaction: t });
      patch.equipment_id = eq.id;
    }
    await r.update(patch, { transaction: t });
    await t.commit();
    return success(res, r, 'Request ' + r.status);
  } catch (e) { await t.rollback(); return next(e); }
};

// ================= Equipment transfers =================
const TRF_FLOW = { Draft: ['Approved', 'Cancelled'], Approved: ['Completed', 'Cancelled'], Completed: [], Cancelled: [] };

const listTransfers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.equipment_id) where.equipment_id = req.query.equipment_id;
    const { rows, count } = await EquipmentTransfer.findAndCountAll({
      where, limit, offset, order: [['transfer_date', 'DESC']], distinct: true,
      include: [
        { model: Equipment, as: 'equipment', attributes: ['id', 'code', 'name'] },
        { model: Project, as: 'from_project', attributes: ['id', 'code', 'name'] },
        { model: Project, as: 'to_project', attributes: ['id', 'code', 'name'] },
      ],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const createTransfer = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'eqtransfer');
    if (!body.equipment_id || !body.to_project_id || !body.transfer_date) return error(res, 'equipment_id, to_project_id and transfer_date required', 422);
    const eq = await Equipment.findOne({ where: { id: body.equipment_id, ...org(req) } });
    if (!eq) return error(res, 'Equipment not found', 404);
    if (!body.from_project_id) body.from_project_id = eq.current_project_id || null;
    const tr = await EquipmentTransfer.create({ ...body, ...org(req) });
    return success(res, tr, 'Transfer drafted', 201);
  } catch (e) { return next(e); }
};

const transitionTransfer = async (req, res, next) => {
  const t = await EquipmentTransfer.sequelize.transaction();
  try {
    const tr = await EquipmentTransfer.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!tr) { await t.rollback(); return error(res, 'Not found', 404); }
    if (!(TRF_FLOW[tr.status] || []).includes(req.body.status)) { await t.rollback(); return error(res, `Cannot move transfer from ${tr.status} to ${req.body.status}`, 422); }
    await tr.update({ status: req.body.status, ...req.body }, { transaction: t });
    if (req.body.status === 'Completed') {
      const eq = await Equipment.findOne({ where: { id: tr.equipment_id, ...org(req) }, transaction: t });
      if (eq) await eq.update({ current_project_id: tr.to_project_id, status: 'OnSite' }, { transaction: t });
    }
    await t.commit();
    return success(res, tr, 'Transfer ' + tr.status);
  } catch (e) { await t.rollback(); return next(e); }
};

// ================= Jobs =================
const JOB_FLOW = { Open: ['InProgress', 'Cancelled'], InProgress: ['OnHold', 'Done'], OnHold: ['InProgress', 'Cancelled'], Done: [], Cancelled: [] };

const listJobs = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.search) {
      where[Op.or] = [{ number: { [Op.like]: `%${req.query.search}%` } }, { title: { [Op.like]: `%${req.query.search}%` } }];
    }
    const { rows, count } = await Job.findAndCountAll({
      where, limit, offset, order: [['scheduled_start', 'ASC']], distinct: true,
      include: [{ model: Project, as: 'project', attributes: ['id', 'code', 'name'] }],
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const data = rows.map((r) => {
      const j = r.toJSON();
      const end = j.scheduled_end ? new Date(j.scheduled_end) : null;
      j.overdue = !['Done', 'Cancelled'].includes(j.status) && end && end < today;
      return j;
    });
    return paginated(res, data, count, page, limit);
  } catch (e) { return next(e); }
};

const createJob = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.number) body.number = await autoNo(req, 'job');
    if (!body.project_id || !body.title) return error(res, 'project_id and title required', 422);
    const j = await Job.create({ ...body, ...org(req) });
    return success(res, j, 'Job created', 201);
  } catch (e) { return next(e); }
};

const updateJob = async (req, res, next) => {
  try {
    const j = await Job.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!j) return error(res, 'Not found', 404);
    if (['Done', 'Cancelled'].includes(j.status)) return error(res, 'Closed jobs cannot be edited', 422);
    const patch = { ...req.body };
    delete patch.status;
    if (patch.progress_pct !== undefined) patch.progress_pct = Math.max(0, Math.min(100, Number(patch.progress_pct)));
    await j.update(patch);
    return success(res, j, 'Job updated');
  } catch (e) { return next(e); }
};

const transitionJob = async (req, res, next) => {
  try {
    const j = await Job.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!j) return error(res, 'Not found', 404);
    if (!(JOB_FLOW[j.status] || []).includes(req.body.status)) return error(res, `Cannot move job from ${j.status} to ${req.body.status}`, 422);
    const patch = { status: req.body.status };
    if (req.body.status === 'InProgress' && !j.actual_start) patch.actual_start = new Date();
    if (req.body.status === 'Done') { patch.actual_end = new Date(); patch.progress_pct = 100; }
    await j.update(patch);
    return success(res, j, 'Job ' + j.status);
  } catch (e) { return next(e); }
};

module.exports = {
  listLabour, createLabour, transitionLabour,
  listEquipment, createEquipment, updateEquipment,
  listEquipmentRequests, createEquipmentRequest, transitionEquipmentRequest,
  listTransfers, createTransfer, transitionTransfer,
  listJobs, createJob, updateJob, transitionJob,
};
