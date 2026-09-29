const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { checkBranchAccess } = require('../middleware/branchAccess');
const c = require('../controllers/siteopsController');
router.use(authenticate, checkBranchAccess);
// Labour
router.get('/labour', checkPermission('labour:view'), c.listLabour);
router.post('/labour', checkPermission('labour:create'), c.createLabour);
router.post('/labour/:id/transition', checkPermission('labour:create'), c.transitionLabour);
// Equipment master
router.get('/equipment', checkPermission('equipment:view'), c.listEquipment);
router.post('/equipment', checkPermission('equipment:create'), c.createEquipment);
router.put('/equipment/:id', checkPermission('equipment:create'), c.updateEquipment);
// Equipment requests
router.get('/equipment-requests', checkPermission('equipment:view'), c.listEquipmentRequests);
router.post('/equipment-requests', checkPermission('equipment:create'), c.createEquipmentRequest);
router.post('/equipment-requests/:id/transition', checkPermission('equipment:create'), c.transitionEquipmentRequest);
// Transfers
router.get('/transfers', checkPermission('equipment:view'), c.listTransfers);
router.post('/transfers', checkPermission('equipment:create'), c.createTransfer);
router.post('/transfers/:id/transition', checkPermission('equipment:create'), c.transitionTransfer);
// Jobs
router.get('/jobs', checkPermission('job:view'), c.listJobs);
router.post('/jobs', checkPermission('job:create'), c.createJob);
router.put('/jobs/:id', checkPermission('job:create'), c.updateJob);
router.post('/jobs/:id/transition', checkPermission('job:create'), c.transitionJob);
module.exports = router;
