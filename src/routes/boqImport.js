const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { checkBranchAccess } = require('../middleware/branchAccess');
const c = require('../controllers/boqImportController');
router.use(authenticate, checkBranchAccess);
router.post('/import', checkPermission('boq:create'), ...c.importExcel);
module.exports = router;
