const { Role, Permission, RolePermission, UserRole, User } = require('../models');
const { success, error } = require('../utils/responseHandler');
const org = (req) => ({ organization_id: req.user.organization_id });

const list = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      where: { ...org(req) },
      include: [{ model: Permission, as: 'permissions', attributes: ['id', 'name', 'group_name'], through: { attributes: [] } }],
      order: [['name', 'ASC']],
    });
    const out = [];
    for (const r of roles) {
      out.push({ ...r.toJSON(), user_count: await UserRole.count({ where: { role_id: r.id } }) });
    }
    return success(res, out);
  } catch (e) { return next(e); }
};
const create = async (req, res, next) => {
  const t = await Role.sequelize.transaction();
  try {
    const { name, permission_ids } = req.body;
    if (!name) { await t.rollback(); return error(res, 'name required', 422); }
    if (['Super Admin', 'Organization Admin'].includes(name)) { await t.rollback(); return error(res, 'Reserved role name', 422); }
    const role = await Role.create({ ...org(req), name }, { transaction: t });
    const pIds = Array.isArray(permission_ids) ? [...new Set(permission_ids)] : [];
    if (pIds.length) {
      const perms = await Permission.findAll({ where: { id: pIds }, transaction: t });
      if (perms.length !== pIds.length) { await t.rollback(); return error(res, 'One or more permissions not found', 404); }
      for (const p of perms) await RolePermission.create({ role_id: role.id, permission_id: p.id }, { transaction: t });
    }
    await t.commit();
    return success(res, await Role.findByPk(role.id, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] }), 'Role created', 201);
  } catch (e) { await t.rollback(); return next(e); }
};
const get = async (req, res, next) => {
  try {
    const r = await Role.findOne({
      where: { id: req.params.id, ...org(req) },
      include: [
        { model: Permission, as: 'permissions', through: { attributes: [] } },
        { model: User, as: 'users', attributes: ['id', 'name', 'email'], through: { attributes: [] } },
      ],
    });
    if (!r) return error(res, 'Not found', 404);
    return success(res, r);
  } catch (e) { return next(e); }
};
const update = async (req, res, next) => {
  const t = await Role.sequelize.transaction();
  try {
    const r = await Role.findOne({ where: { id: req.params.id, ...org(req) }, transaction: t });
    if (!r) { await t.rollback(); return error(res, 'Not found', 404); }
    if (r.is_system && req.body.name && req.body.name !== r.name) { await t.rollback(); return error(res, 'System roles cannot be renamed', 422); }
    if (req.body.name && !r.is_system) await r.update({ name: req.body.name }, { transaction: t });
    if (Array.isArray(req.body.permission_ids)) {
      const pIds = [...new Set(req.body.permission_ids)];
      const perms = await Permission.findAll({ where: { id: pIds }, transaction: t });
      if (perms.length !== pIds.length) { await t.rollback(); return error(res, 'One or more permissions not found', 404); }
      await RolePermission.destroy({ where: { role_id: r.id }, transaction: t });
      for (const p of perms) await RolePermission.create({ role_id: r.id, permission_id: p.id }, { transaction: t });
    }
    await t.commit();
    return success(res, await Role.findByPk(r.id, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] }), 'Role updated');
  } catch (e) { await t.rollback(); return next(e); }
};
const remove = async (req, res, next) => {
  try {
    const r = await Role.findOne({ where: { id: req.params.id, ...org(req) } });
    if (!r) return error(res, 'Not found', 404);
    if (r.is_system) return error(res, 'System roles cannot be deleted', 422);
    if (await UserRole.count({ where: { role_id: r.id } }) > 0) return error(res, 'Role is assigned to users', 422);
    await RolePermission.destroy({ where: { role_id: r.id } });
    await r.destroy();
    return success(res, null, 'Role deleted');
  } catch (e) { return next(e); }
};
const listPermissions = async (req, res, next) => {
  try {
    return success(res, await Permission.findAll({ order: [['group_name', 'ASC'], ['name', 'ASC']] }));
  } catch (e) { return next(e); }
};
const matrix = async (req, res, next) => {
  try {
    const perms = await Permission.findAll({ order: [['group_name', 'ASC'], ['name', 'ASC']] });
    const groups = [];
    const byGroup = {};
    for (const p of perms) {
      byGroup[p.group_name] = byGroup[p.group_name] || { group: p.group_name, permissions: [] };
      byGroup[p.group_name].permissions.push({ id: p.id, name: p.name });
    }
    Object.keys(byGroup).sort().forEach((g) => groups.push(byGroup[g]));
    return success(res, groups);
  } catch (e) { return next(e); }
};
module.exports = { list, create, get, update, remove, listPermissions, matrix };
