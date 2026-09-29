const auditLogger = () => (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const started = Date.now();
  res.on('finish', () => {
    try {
      const { AuditLog } = require('../models');
      if (!AuditLog || !req.user) return;
      AuditLog.create({
        organization_id: req.user.organization_id,
        user_id: req.user.id,
        action: req.method + ' ' + req.path,
        entity: req.baseUrl,
        status_code: res.statusCode,
        duration_ms: Date.now() - started,
      }).catch(() => {});
    } catch { /* ignore */ }
  });
  return next();
};
module.exports = auditLogger;
