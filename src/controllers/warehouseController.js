const { Op } = require('sequelize');
const { Warehouse } = require('../models');
const { success, paginated, error } = require('../utils/responseHandler');
const { getPagination } = require('../utils/pagination');

const org = (req) => ({ organization_id: req.user.organization_id });

// List Warehouses
const listWarehouses = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const where = { ...org(req) };

    if (req.query.search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${req.query.search}%` } },
        { name: { [Op.like]: `%${req.query.search}%` } },
        { name_ar: { [Op.like]: `%${req.query.search}%` } },
        { contact_person: { [Op.like]: `%${req.query.search}%` } },
        { phone: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    if (req.query.active === '1') {
      where.is_active = true;
    }

    const { rows, count } = await Warehouse.findAndCountAll({
      where,
      limit,
      offset,
      order: [['is_default', 'DESC'], ['name', 'ASC']],
    });

    return paginated(res, rows, count, page, limit);
  } catch (e) {
    return next(e);
  }
};

// Get Single Warehouse
const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, ...org(req) },
    });
    if (!warehouse) return error(res, 'Warehouse not found', 404);
    return success(res, warehouse);
  } catch (e) {
    return next(e);
  }
};

// Create Warehouse
const createWarehouse = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name) return error(res, 'Warehouse name is required', 422);

    const generatedCode =
      code ||
      name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .slice(0, 15) ||
      `WH_${Date.now()}`;

    // If marked default, unset existing default
    if (req.body.is_default) {
      await Warehouse.update(
        { is_default: false },
        { where: { ...org(req), is_default: true } }
      );
    }

    const warehouse = await Warehouse.create({
      ...req.body,
      code: generatedCode,
      ...org(req),
    });

    return success(res, warehouse, 'Warehouse created successfully', 201);
  } catch (e) {
    return next(e);
  }
};

// Update Warehouse
const updateWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, ...org(req) },
    });
    if (!warehouse) return error(res, 'Warehouse not found', 404);

    if (req.body.is_default) {
      await Warehouse.update(
        { is_default: false },
        { where: { ...org(req), is_default: true } }
      );
    }

    await warehouse.update(req.body);
    return success(res, warehouse, 'Warehouse updated successfully');
  } catch (e) {
    return next(e);
  }
};

// Delete Warehouse
const deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, ...org(req) },
    });
    if (!warehouse) return error(res, 'Warehouse not found', 404);

    await warehouse.destroy();
    return success(res, null, 'Warehouse deleted successfully');
  } catch (e) {
    return next(e);
  }
};

module.exports = {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
