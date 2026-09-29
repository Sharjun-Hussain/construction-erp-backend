const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Organization, User, Branch, Role, Permission, RolePermission, UserRole, Project } = require('../models');
const { success, error, paginated } = require('../utils/responseHandler');
const { getPagination } = require('../utils/pagination');
const { Op } = require('sequelize');

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
  ['user:view', 'Admin'], ['role:view', 'Admin'],
  ['user:create', 'Admin'], ['user:edit', 'Admin'], ['user:delete', 'Admin'],
  ['role:create', 'Admin'], ['role:edit', 'Admin'], ['role:delete', 'Admin'],
  ['organization:view', 'Admin'], ['organization:create', 'Admin'], ['organization:edit', 'Admin'],
];

const list = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = {};
    if (req.query.is_active !== undefined && req.query.is_active !== '') {
      where.is_active = req.query.is_active === 'true';
    }
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { name_ar: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
        { cr_number: { [Op.like]: `%${req.query.search}%` } },
        { vat_number: { [Op.like]: `%${req.query.search}%` } },
        { city: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await Organization.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    // Populate user and project statistics
    const out = [];
    for (const org of rows) {
      const j = org.toJSON();
      const [userCount, projectCount, branchCount] = await Promise.all([
        User.count({ where: { organization_id: org.id } }),
        Project.count({ where: { organization_id: org.id } }),
        Branch.count({ where: { organization_id: org.id } }),
      ]);
      j.user_count = userCount;
      j.project_count = projectCount;
      j.branch_count = branchCount;
      out.push(j);
    }

    return paginated(res, out, count, page, limit);
  } catch (e) {
    return next(e);
  }
};

const get = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id, {
      include: [
        { model: Branch, as: 'branches' },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'phone', 'is_active', 'last_login_at', 'created_at'],
          include: [{ model: Role, as: 'roles', attributes: ['id', 'name'], through: { attributes: [] } }],
        },
      ],
    });
    if (!org) return error(res, 'Organization not found', 404);

    const projectCount = await Project.count({ where: { organization_id: org.id } });
    const j = org.toJSON();
    j.project_count = projectCount;
    return success(res, j);
  } catch (e) {
    return next(e);
  }
};

const create = async (req, res, next) => {
  const t = await Organization.sequelize.transaction();
  try {
    const {
      name,
      name_ar,
      cr_number,
      vat_number,
      city = 'Riyadh',
      address,
      national_address,
      email,
      phone,
      currency = 'SAR',
      language_default = 'en',
      projects_enabled = true,
      estimation_enabled = true,
      zatca_enabled = true,
      hrm_enabled = true,
      accounting_enabled = true,
      admin_name,
      admin_email,
      admin_password,
      admin_phone,
    } = req.body;

    if (!name || !admin_name || !admin_email) {
      await t.rollback();
      return error(res, 'Company name, Admin name, and Admin email are required', 422);
    }

    // Check duplicate admin email across organization
    const emailLc = String(admin_email).toLowerCase().trim();
    const existingUser = await User.findOne({ where: { email: emailLc }, transaction: t });
    if (existingUser) {
      await t.rollback();
      return error(res, `Email "${admin_email}" is already registered by another account`, 409);
    }

    // 1. Create Organization tenant
    const org = await Organization.create(
      {
        name,
        name_ar: name_ar || null,
        cr_number: cr_number || null,
        vat_number: vat_number || null,
        city: city || 'Riyadh',
        country: 'SA',
        address: address || null,
        national_address: national_address || null,
        email: email || emailLc,
        phone: phone || admin_phone || null,
        currency,
        language_default,
        is_active: true,
        is_master: false,
        projects_enabled,
        estimation_enabled,
        zatca_enabled,
        hrm_enabled,
        accounting_enabled,
      },
      { transaction: t }
    );

    // 2. Create Initial HQ Branch
    const branch = await Branch.create(
      {
        organization_id: org.id,
        name: `${city} Head Office`,
        city: city || 'Riyadh',
        address: address || null,
        is_main: true,
      },
      { transaction: t }
    );

    // 3. Prepare Permissions
    const perms = [];
    for (const [pn, pg] of QULF_PERMS) {
      const [p] = await Permission.findOrCreate({
        where: { name: pn },
        defaults: { name: pn, group_name: pg },
        transaction: t,
      });
      perms.push(p);
    }

    // 4. Create Organization Admin Role
    const adminRole = await Role.create(
      {
        organization_id: org.id,
        name: 'Organization Admin',
        is_system: true,
      },
      { transaction: t }
    );

    for (const p of perms) {
      await RolePermission.create({ role_id: adminRole.id, permission_id: p.id }, { transaction: t });
    }

    // 5. Create Organization Client Admin User
    const rawPassword = admin_password || `Qulf@${crypto.randomInt(1000, 9999)}`;
    const hash = await bcrypt.hash(rawPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10));

    const user = await User.create(
      {
        organization_id: org.id,
        branch_id: branch.id,
        name: admin_name,
        email: emailLc,
        password_hash: hash,
        phone: admin_phone || null,
        language: language_default || 'en',
        is_active: true,
      },
      { transaction: t }
    );

    await UserRole.create({ user_id: user.id, role_id: adminRole.id }, { transaction: t });

    await t.commit();

    return success(
      res,
      {
        ...org.toJSON(),
        admin_user: {
          id: user.id,
          name: user.name,
          email: user.email,
          temp_password: rawPassword,
        },
      },
      'Organization provisioned successfully',
      201
    );
  } catch (e) {
    await t.rollback();
    return next(e);
  }
};

const update = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return error(res, 'Organization not found', 404);

    const {
      name,
      name_ar,
      cr_number,
      vat_number,
      city,
      address,
      national_address,
      email,
      phone,
      currency,
      language_default,
      projects_enabled,
      estimation_enabled,
      zatca_enabled,
      hrm_enabled,
      accounting_enabled,
    } = req.body;

    await org.update({
      name: name ?? org.name,
      name_ar: name_ar ?? org.name_ar,
      cr_number: cr_number ?? org.cr_number,
      vat_number: vat_number ?? org.vat_number,
      city: city ?? org.city,
      address: address ?? org.address,
      national_address: national_address ?? org.national_address,
      email: email ?? org.email,
      phone: phone ?? org.phone,
      currency: currency ?? org.currency,
      language_default: language_default ?? org.language_default,
      projects_enabled: projects_enabled ?? org.projects_enabled,
      estimation_enabled: estimation_enabled ?? org.estimation_enabled,
      zatca_enabled: zatca_enabled ?? org.zatca_enabled,
      hrm_enabled: hrm_enabled ?? org.hrm_enabled,
      accounting_enabled: accounting_enabled ?? org.accounting_enabled,
    });

    return success(res, org, 'Organization updated');
  } catch (e) {
    return next(e);
  }
};

const activate = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return error(res, 'Organization not found', 404);
    await org.update({ is_active: true });
    return success(res, org, 'Organization activated');
  } catch (e) {
    return next(e);
  }
};

const deactivate = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return error(res, 'Organization not found', 404);
    await org.update({ is_active: false });
    return success(res, org, 'Organization suspended');
  } catch (e) {
    return next(e);
  }
};

module.exports = {
  list,
  get,
  create,
  update,
  activate,
  deactivate,
};
