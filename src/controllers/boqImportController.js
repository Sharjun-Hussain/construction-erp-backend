const multer = require('multer');
const XLSX = require('xlsx');
const { Boq, BoqItem, Project } = require('../models');
const { success } = require('../utils/responseHandler');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const importExcel = [upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return success(res, null, 'Excel file required', 422);
    const project = await Project.findOne({ where: { id: req.body.project_id, organization_id: req.user.organization_id } });
    if (!project) return success(res, null, 'Project not found', 404);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return success(res, null, 'Empty sheet', 422);
    const norm = (r) => {
      const get = (...keys) => {
        for (const k of Object.keys(r)) {
          const kl = k.toLowerCase().replace(/[^a-z]/g, '');
          if (keys.includes(kl)) return r[k];
        }
        return '';
      };
      return {
        line_no: String(get('lineno', 'line', 'item', 'no') || ''),
        description: String(get('description', 'desc', 'itemdescription') || ''),
        unit: String(get('unit', 'uom') || 'LS'),
        quantity: Number(get('quantity', 'qty') || 0),
        unit_rate: Number(get('unitrate', 'rate', 'price') || 0),
        trade: String(get('trade', 'division', 'section') || ''),
      };
    };
    const boq = await Boq.create({
      organization_id: req.user.organization_id, project_id: project.id,
      number: req.body.number || ('BOQ-' + Date.now()), title: req.body.title || 'Imported BOQ',
    });
    let total = 0, count = 0;
    for (const r of rows) {
      const n = norm(r);
      if (!n.description) continue;
      const amount = n.quantity * n.unit_rate;
      await BoqItem.create({ ...n, amount, boq_id: boq.id, organization_id: req.user.organization_id });
      total += amount; count++;
    }
    await boq.update({ total_amount: total });
    return success(res, { boq_id: boq.id, items: count, total_amount: total }, 'Imported ' + count + ' items', 201);
  } catch (e) { return next(e); }
}];
module.exports = { importExcel };
