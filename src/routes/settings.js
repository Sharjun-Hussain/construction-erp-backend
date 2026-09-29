const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const c = require('../controllers/settingController');
router.use(authenticate);
router.get('/', checkPermission('setting:view'), c.get);
router.put('/', checkPermission('setting:edit'), c.update);
module.exports = router;
