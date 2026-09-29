const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { checkBranchAccess } = require('../middleware/branchAccess');
const c = require('../controllers/prebidController');
router.use(authenticate, checkBranchAccess);
// Enquiries
router.get('/enquiries', checkPermission('enquiry:view'), c.listEnquiries);
router.get('/enquiries/:id', checkPermission('enquiry:view'), c.getEnquiry);
router.post('/enquiries', checkPermission('enquiry:create'), c.createEnquiry);
router.put('/enquiries/:id', checkPermission('enquiry:create'), c.updateEnquiry);
router.post('/enquiries/:id/transition', checkPermission('enquiry:create'), c.transitionEnquiry);
router.post('/enquiries/:id/convert', checkPermission('enquiry:create'), c.convertEnquiry);
// Site inspections
router.get('/inspections', checkPermission('inspection:view'), c.listInspections);
router.get('/inspections/:id', checkPermission('inspection:view'), c.getInspection);
router.post('/inspections', checkPermission('inspection:create'), c.createInspection);
router.post('/inspections/:id/complete', checkPermission('inspection:create'), c.completeInspection);
// Proposals
router.get('/proposals', checkPermission('proposal:view'), c.listProposals);
router.get('/proposals/:id', checkPermission('proposal:view'), c.getProposal);
router.get('/proposals/:id/export', checkPermission('proposal:view'), c.exportProposal);
router.post('/proposals', checkPermission('proposal:create'), c.createProposal);
router.put('/proposals/:id', checkPermission('proposal:create'), c.updateProposal);
router.post('/proposals/:id/transition', checkPermission('proposal:create'), c.transitionProposal);
router.post('/proposals/:id/revise', checkPermission('proposal:create'), c.reviseProposal);
module.exports = router;
