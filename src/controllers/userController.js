const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Role, Branch, UserRole, RefreshToken } = require('../models');
const { getPagination } = require('../utils/pagination');
const { success, paginated, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });
const SALT = () => parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
const pub = (u) => {
  const j = u.toJSON ? u.toJSON() : u;
  delete j.password_hash;
  return j;
};

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };
    if (req.query.branch_id) where.branch_id = req.query.branch_id;
    if (req.query.is_active !== undefined && req.query.is_active !== '') where.is_active = req.query.is_active === 'true';
    if (req.query.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [{ name: { [Op.like]: `%${req.query.search}%` } }, { email: { [Op.like]: `%${req.query.search}%` } }];
    }
    const SORTABLE = ['name', 'email', 'created_at', 'last_login_at'];
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { rows, count } = await User.findAndCountAll({
      where, limit, offset, order: [[sortBy, sortDir]],
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name'], through: { attributes: [] } },
        { model: Branch, as: 'branches', attributes: ['id', 'name'], through: { attributes: [] } },
      ],
    });
    return paginated(res, rows, count, page, limit);
  } catch (e) { return next(e); }
};

const create = async (req, res, next) => {
  const t = await User.sequelize.transaction();
  try {
    const { name, email, password, phone, branch_id, branch_ids, role_ids, language } = req.body;
    if (!name || !email) { await t.rollback(); return error(res, 'name and email required', 422); }
    const emailLc = String(email).toLowerCase();
    const exists = await User.findOne({ where: { ...org(req), email: emailLc }, transaction: t });
    if (exists) { await t.rollback(); return error(res, 'Email already in use in this organization', 409); }
    const temp = password || ('Qulf@' + crypto.randomInt(1000, 9999));
    const hash = await bcrypt.hash(temp, SALT());
    const mainBranch = branch_id || (req.user.branches[0] && req.user.branches[0].id) || null;
    const user = await User.create({
      ...org(req), name, email: emailLc, password_hash: hash,
      phone: phone || null, branch_id: mainBranch, language: language || 'en',
    }, { transaction: t });
    if (Array.isArray(role_ids) && role_ids.length) {
      const roles = await Role.findAll({ where: { id: role_ids, ...org(req) }, transaction: t });
      if (roles.length !== role_ids.length) { await t.rollback(); return error(res, 'One or more roles not found', 404); }
      for (const r of roles) await UserRole.create({ user_id: user.id, role_id: r.id }, { transaction: t });
    }
    const bIds = Array.isArray(branch_ids) && branch_ids.length ? branch_ids : (mainBranch ? [mainBranch] : []);
    if (bIds.length) {
      const branches = await Branch.findAll({ where: { id: bIds, ...org(req) }, transaction: t });
      await user.setBranches(branches, { transaction: t });
    }
    await t.commit();
    const full = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Role, as: 'roles', attributes: ['id', 'name'], through: { attributes: [] } }],
    });
    return success(res, { ...pub(full), temp_password: temp }, 'User created', 201);
  } catch (e) { await t.rollback(); return next(e); }
};

const get = async (req, res, next) => {
  try {
    const u = await User.findOne({
      where: { id: req.params.id, ...org(req) },
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name'], through: { attributes: [] } },
        { model: Branch, as: 'branches', attributes: ['id', 'name'], through: { attributes: [] } },
      ],
    });
    if (!u) return error(res, 'Not found', 404);
    return success(res, u);
  } catch (e) { return next(e); }
};

const update = async (req, res, next) => {
  const t = await User.sequelize.transaction();
  try {
    const u = await User.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!u) { await t.rollback(); return error(res, 'Not found', 404); }
    const { name, phone, branch_id, language, role_ids, branch_ids } = req.body;
    if (String(req.user.id) === String(u.id) && role_ids) { await t.rollback(); return error(res, 'You cannot change your own roles', 422); }
    await u.update({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(branch_id !== undefined ? { branch_id } : {}),
      ...(language !== undefined ? { language } : {}),
    }, { transaction: t });
    if (Array.isArray(role_ids)) {
      const roles = await Role.findAll({ where: { id: role_ids, ...org(req) }, transaction: t });
      if (roles.length !== role_ids.length) { await t.rollback(); return error(res, 'One or more roles not found', 404); }
      await UserRole.destroy({ where: { user_id: u.id }, transaction: t });
      for (const r of roles) await UserRole.create({ user_id: u.id, role_id: r.id }, { transaction: t });
    }
    if (Array.isArray(branch_ids)) {
      const branches = await Branch.findAll({ where: { id: branch_ids, ...org(req) }, transaction: t });
      if (branches.length !== branch_ids.length) { await t.rollback(); return error(res, 'One or more branches not found', 404); }
      await u.setBranches(branches, { transaction: t });
    }
    await t.commit();
    return success(res, await User.findByPk(u.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name'], through: { attributes: [] } },
        { model: Branch, as: 'branches', attributes: ['id', 'name'], through: { attributes: [] } },
      ],
    }), 'Updated');
  } catch (e) { await t.rollback(); return next(e); }
};

const setActive = (active) => async (req, res, next) => {
  try {
    const u = await User.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!u) return error(res, 'Not found', 404);
    if (String(req.user.id) === String(u.id)) return error(res, 'You cannot deactivate your own account', 422);
    await u.update({ is_active: active });
    if (!active) await RefreshToken.update({ revoked: true }, { where: { user_id: u.id } });
    return success(res, pub(u), active ? 'User activated' : 'User deactivated, sessions revoked');
  } catch (e) { return next(e); }
};

const resetPassword = async (req, res, next) => {
  try {
    const u = await User.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!u) return error(res, 'Not found', 404);
    const temp = req.body.password || ('Qulf@' + crypto.randomInt(1000, 9999));
    await u.update({ password_hash: await bcrypt.hash(temp, SALT()) });
    await RefreshToken.update({ revoked: true }, { where: { user_id: u.id } });
    return success(res, { temp_password: temp }, 'Password reset, all sessions revoked');
  } catch (e) { return next(e); }
};

const remove = async (req, res, next) => {
  try {
    const u = await User.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [{ model: Role, as: 'roles', attributes: ['id', 'name'], through: { attributes: [] } }],
    });
    if (!u) return error(res, 'Not found', 404);
    if (String(req.user.id) === String(u.id)) return error(res, 'You cannot delete your own account', 422);
    if (u.roles.some((r) => r.name === 'Organization Admin')) {
      const admins = await UserRole.count({ where: { role_id: u.roles.find((r) => r.name === 'Organization Admin').id } });
      const others = await User.count({ where: { ...org(req), is_active: true } });
      if (admins <= 1 || others <= 1) return error(res, 'Cannot delete the last administrator', 422);
    }
    await RefreshToken.update({ revoked: true }, { where: { user_id: u.id } });
    await UserRole.destroy({ where: { user_id: u.id } });
    await u.destroy();
    return success(res, null, 'User deleted');
  } catch (e) { return next(e); }
};

module.exports = {
  list, create, get, update,
  activate: null, deactivate: null, resetPassword, remove,
};
module.exports.activate = setActive(true);
module.exports.deactivate = setActive(false);
