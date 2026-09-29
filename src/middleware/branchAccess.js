const applyBranchFilter = (req, where = {}) => {
  if (req.isSuperAdmin || req.allowAllBranches) return where;
  const ids = (req.user.branches || []).map((b) => b.id);
  if (req.branchId) {
    if (!ids.includes(req.branchId)) throw Object.assign(new Error('No access to branch'), { statusCode: 403 });
    return { ...where, branch_id: req.branchId };
  }
  if (ids.length) return { ...where, branch_id: ids };
  return where;
};
const checkBranchAccess = async (req, res, next) => {
  try {
    const headerId = req.headers['x-branch-id'];
    const userBranches = req.user.branches || [];
    const isPrivileged = req.isSuperAdmin || req.user.roles.some((r) => ['Organization Admin'].includes(r.name));
    req.allowAllBranches = isPrivileged && !headerId;
    if (headerId) {
      const found = userBranches.find((b) => b.id === headerId);
      if (!found && !isPrivileged) return res.status(403).json({ status: 'error', message: 'No access to branch' });
      req.branchId = headerId;
    } else if (userBranches.length === 1) {
      req.branchId = userBranches[0].id;
    }
    const proj = req.headers['x-project-id'];
    if (proj) req.projectId = proj;
    return next();
  } catch (err) { return next(err); }
};
module.exports = { checkBranchAccess, applyBranchFilter };
