const matches = (have, need) => {
  if (have === '*' || have === need) return true;
  const [hm, ha] = have.split(':');
  const [nm, na] = need.split(':');
  return hm === nm && (ha === '*' || ha === na);
};
const collect = (user) => {
  const set = new Set();
  (user.roles || []).forEach((r) => (r.permissions || []).forEach((p) => set.add(p.name)));
  return [...set];
};
const checkPermission = (needed) => (req, res, next) => {
  if (req.isSuperAdmin) return next();
  const perms = collect(req.user);
  const ok = Array.isArray(needed) ? needed.some((n) => perms.some((p) => matches(p, n))) : perms.some((p) => matches(p, needed));
  if (!ok) return res.status(403).json({ status: 'error', message: 'Forbidden: missing permission ' + needed });
  return next();
};
const checkAnyPermission = (list) => checkPermission(list);
module.exports = checkPermission;
module.exports.checkPermission = checkPermission;
module.exports.checkAnyPermission = checkAnyPermission;
