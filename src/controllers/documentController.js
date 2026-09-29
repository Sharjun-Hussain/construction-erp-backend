const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Document } = require('../models');
const { success } = require('../utils/responseHandler');
const dir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')),
});
const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) } });
const uploadOne = [upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return success(res, null, 'file required', 422);
    const d = await Document.create({
      organization_id: req.user.organization_id,
      entity_type: req.body.entity_type, entity_id: req.body.entity_id,
      file_name: req.file.originalname, file_path: req.file.filename,
      mime: req.file.mimetype, size: req.file.size, uploaded_by: req.user.id,
    });
    return success(res, d, 'Uploaded', 201);
  } catch (e) { return next(e); }
}];
const list = async (req, res, next) => {
  try {
    const where = { organization_id: req.user.organization_id };
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id) where.entity_id = req.query.entity_id;
    return success(res, await Document.findAll({ where, order: [['created_at', 'DESC']] }));
  } catch (e) { return next(e); }
};
const download = async (req, res, next) => {
  try {
    const d = await Document.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!d) return success(res, null, 'Not found', 404);
    return res.download(path.join(dir, d.file_path), d.file_name);
  } catch (e) { return next(e); }
};
const remove = async (req, res, next) => {
  try {
    const d = await Document.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!d) return success(res, null, 'Not found', 404);
    try { fs.unlinkSync(path.join(dir, d.file_path)); } catch { /* file already gone */ }
    await d.destroy();
    return success(res, null, 'Document deleted');
  } catch (e) { return next(e); }
};
module.exports = { uploadOne, list, download, remove };
