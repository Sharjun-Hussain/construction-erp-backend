const { Project, Boq, BoqItem, Estimation, PurchaseOrder, Grn, IpcInvoice, ScWorkOrder, ScCertificate, VariationOrder } = require('../models');
const { success, error } = require('../utils/responseHandler');
const sum = (rows, f) => rows.reduce((s, r) => s + Number(r[f] || 0), 0);
const projectSummary = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const project = await Project.findOne({ where: { id: req.params.id, organization_id: orgId } });
    if (!project) return error(res, 'Not found', 404);
    const boqs = await Boq.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const boqIds = boqs.map((b) => b.id);
    const items = boqIds.length ? await BoqItem.findAll({ where: { boq_id: boqIds, organization_id: orgId } }) : [];
    const ests = await Estimation.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const pos = await PurchaseOrder.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const grns = await Grn.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const ipcs = await IpcInvoice.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const wos = await ScWorkOrder.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const certs = await ScCertificate.findAll({ where: { project_id: project.id, organization_id: orgId } });
    const vos = await VariationOrder.findAll({ where: { project_id: project.id, organization_id: orgId, status: 'Approved' } });
    const boqTotal = sum(items, 'amount');
    const doneValue = items.reduce((s, i) => s + Number(i.progress_qty || 0) * Number(i.unit_rate || 0), 0);
    return success(res, {
      project,
      contract_value: Number(project.contract_value || 0),
      boq_total: boqTotal,
      progress_pct: boqTotal ? +(doneValue / boqTotal * 100).toFixed(2) : 0,
      progress_value: +doneValue.toFixed(2),
      estimation_sell: sum(ests, 'sell_total'),
      po_committed: sum(pos, 'total'),
      grn_received: sum(grns, 'total'),
      ipc_billed: sum(ipcs, 'net_amount'),
      retention_held: sum(ipcs, 'retention_amount'),
      sc_committed: sum(wos, 'amount'),
      sc_certified: sum(certs, 'net'),
      variations_approved: sum(vos, 'amount'),
      margin_vs_boq: +(boqTotal - sum(ests, 'total_cost')).toFixed(2),
    });
  } catch (e) { return next(e); }
};
const overview = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const projects = await Project.findAll({ where: { organization_id: orgId } });
    const ipcs = await IpcInvoice.findAll({ where: { organization_id: orgId } });
    const pos = await PurchaseOrder.findAll({ where: { organization_id: orgId } });
    return success(res, {
      projects_total: projects.length,
      projects_active: projects.filter((p) => p.status === 'InProgress').length,
      contract_total: sum(projects, 'contract_value'),
      ipc_billed: sum(ipcs, 'net_amount'),
      po_committed: sum(pos, 'total'),
    });
  } catch (e) { return next(e); }
};
module.exports = { projectSummary, overview };
