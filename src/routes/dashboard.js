const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const c = require('../controllers/dashboardController');
router.use(authenticate);
router.get('/overview', checkPermission('project:view'), c.overview);
router.get('/project/:id', checkPermission('project:view'), c.projectSummary);
module.exports = router;
