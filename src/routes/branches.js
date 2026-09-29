const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const c = require('../controllers/branchController');
router.use(authenticate);
router.get('/', checkPermission('user:view'), c.list);
module.exports = router;
