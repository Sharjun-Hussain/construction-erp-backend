const bcrypt = require('bcryptjs');
const { User, Organization, Branch, Role, Permission, RolePermission, UserRole, RefreshToken } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwtHelper');
const { success, error } = require('../utils/responseHandler');

const QULF_PERMS = [
  ['project:view', 'Projects'], ['project:create', 'Projects'], ['project:edit', 'Projects'],
  ['boq:view', 'BOQ'], ['boq:create', 'BOQ'], ['boq:edit', 'BOQ'], ['boq:approve', 'BOQ'],
  ['estimation:view', 'Estimation'], ['estimation:create', 'Estimation'], ['estimation:edit', 'Estimation'], ['estimation:approve', 'Estimation'],
  ['tender:view', 'Tender'], ['tender:create', 'Tender'],
  ['ipc:view', 'IPC'], ['ipc:create', 'IPC'],
  ['procurement:view', 'Procurement'], ['procurement:create', 'Procurement'], ['procurement:approve', 'Procurement'],
  ['subcontract:view', 'Subcontract'], ['subcontract:create', 'Subcontract'], ['subcontract:approve', 'Subcontract'],
  ['site:view', 'Site'], ['site:create', 'Site'], ['site:approve', 'Site'],
  ['document:view', 'Documents'], ['document:create', 'Documents'],
  ['customer:view', 'Customers'], ['customer:create', 'Customers'], ['customer:edit', 'Customers'], ['customer:delete', 'Customers'],
  ['user:view', 'Admin'], ['role:view', 'Admin'],
  ['user:create', 'Admin'], ['user:edit', 'Admin'], ['user:delete', 'Admin'],
  ['role:create', 'Admin'], ['role:edit', 'Admin'], ['role:delete', 'Admin'],
  ['setting:view', 'Admin'], ['setting:edit', 'Admin'],
];

const registerOrg = async (req, res, next) => {
  const t = await User.sequelize.transaction();
  try {
    const { org_name, name, email, password } = req.body;
    if (!org_name || !name || !email || !password) return error(res, 'org_name, name, email, password required', 422);
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10));
    const org = await Organization.create({ name: org_name }, { transaction: t });
    const branch = await Branch.create({ organization_id: org.id, name: 'Head Office', is_main: true }, { transaction: t });
    const user = await User.create({ organization_id: org.id, branch_id: branch.id, name, email: email.toLowerCase(), password_hash: hash }, { transaction: t });
    const perms = [];
    for (const [n, g] of QULF_PERMS) {
      const [p] = await Permission.findOrCreate({ where: { name: n }, defaults: { name: n, group_name: g }, transaction: t });
      perms.push(p);
    }
    const adminRole = await Role.create({ organization_id: org.id, name: 'Organization Admin', is_system: true }, { transaction: t });
    for (const p of perms) await RolePermission.create({ role_id: adminRole.id, permission_id: p.id }, { transaction: t });
    await UserRole.create({ user_id: user.id, role_id: adminRole.id }, { transaction: t });
    await t.commit();
    const access = generateAccessToken(user.id);
    const refresh = generateRefreshToken(user.id);
    await RefreshToken.create({ user_id: user.id, token: refresh, expires_at: new Date(Date.now() + 7 * 864e5) });
    return success(res, { access_token: access, refresh_token: refresh, organization_id: org.id }, 'Organization registered', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: String(email || '').toLowerCase() } });
    if (!user) return error(res, 'Invalid credentials', 401);
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return error(res, 'Invalid credentials', 401);
    const access = generateAccessToken(user.id);
    const refresh = generateRefreshToken(user.id);
    await RefreshToken.create({ user_id: user.id, token: refresh, expires_at: new Date(Date.now() + 7 * 864e5) });
    await user.update({ last_login_at: new Date() });
    return success(res, { access_token: access, refresh_token: refresh });
  } catch (e) { return next(e); }
};

const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const payload = verifyToken(refresh_token, true);
    const stored = await RefreshToken.findOne({ where: { token: refresh_token, revoked: false } });
    if (!stored) return error(res, 'Refresh revoked', 401);
    return success(res, { access_token: generateAccessToken(payload.id) });
  } catch (e) { return next(e); }
};

const me = async (req, res) => success(res, req.user);

const logout = async (req, res, next) => {
  try {
    if (req.body.refresh_token) await RefreshToken.update({ revoked: true }, { where: { token: req.body.refresh_token } });
    return success(res, null, 'Logged out');
  } catch (e) { return next(e); }
};
const changePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const ok = await bcrypt.compare(req.body.current_password || '', user.password_hash);
    if (!ok) return error(res, 'Current password is incorrect', 401);
    if (!req.body.new_password || String(req.body.new_password).length < 6) return error(res, 'New password must be at least 6 characters', 422);
    await user.update({ password_hash: await bcrypt.hash(req.body.new_password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)) });
    await RefreshToken.update({ revoked: true }, { where: { user_id: user.id } });
    return success(res, null, 'Password changed, please login again');
  } catch (e) { return next(e); }
};
const sessions = async (req, res, next) => {
  try {
    const rows = await RefreshToken.findAll({
      where: { user_id: req.user.id, revoked: false },
      attributes: ['id', 'expires_at', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    return success(res, rows);
  } catch (e) { return next(e); }
};
const revokeSession = async (req, res, next) => {
  try {
    const s = await RefreshToken.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!s) return error(res, 'Not found', 404);
    await s.update({ revoked: true });
    return success(res, null, 'Session revoked');
  } catch (e) { return next(e); }
};
module.exports = { registerOrg, login, refresh, me, logout, changePassword, sessions, revokeSession };
