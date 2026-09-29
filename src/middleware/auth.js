const jwt = require('jsonwebtoken');
const { User, Role, Permission, Branch, Organization } = require('../models');
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ status: 'error', message: 'No token provided' });
    const decoded = jwt.verify(header.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Role, as: 'roles', include: [{ model: Permission, as: 'permissions' }] },
        { model: Branch, as: 'branches' },
        { model: Organization, as: 'organization' },
      ],
    });
    if (!user) return res.status(401).json({ status: 'error', message: 'User not found' });
    if (!user.is_active) return res.status(403).json({ status: 'error', message: 'Account deactivated' });
    const isSuper = user.roles.some((r) => r.name === 'Super Admin');
    if (!isSuper && user.organization && !user.organization.is_active)
      return res.status(403).json({ status: 'error', message: 'Organization deactivated', reason: 'ORGANIZATION_SUSPENDED' });
    req.user = user;
    req.isSuperAdmin = isSuper;
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ status: 'error', message: 'Invalid token' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ status: 'error', message: 'Token expired' });
    return next(err);
  }
};
module.exports = authenticate;
