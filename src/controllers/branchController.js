const { Branch } = require('../models');
const { success } = require('../utils/responseHandler');
const list = async (req, res, next) => {
  try {
    return success(res, await Branch.findAll({
      where: { organization_id: req.user.organization_id },
      order: [['is_main', 'DESC'], ['name', 'ASC']],
    }));
  } catch (e) { return next(e); }
};
module.exports = { list };
