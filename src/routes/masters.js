const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { checkBranchAccess } = require('../middleware/branchAccess');
const c = require('../controllers/mastersController');
router.use(authenticate, checkBranchAccess);

// Lookups
router.get('/lookup/:type', checkPermission('master:view'), c.listLookups);
router.post('/lookup/:type', checkPermission('master:create'), c.createLookup);
router.put('/lookup/:type/:id', checkPermission('master:create'), c.updateLookup);
router.delete('/lookup/:type/:id', checkPermission('master:delete'), c.removeLookup);

// Special endpoints
router.get('/currency-rates/latest', checkPermission('master:view'), c.latestRates);
router.get('/currency-rates/convert', checkPermission('master:view'), c.convertFx);
router.post('/fiscal-years/:id/activate', checkPermission('master:create'), c.activateFiscalYear);
router.get('/period-locks/check', checkPermission('master:view'), c.checkLock);
router.get('/approvals-inbox', checkPermission('master:view'), c.approvalsInbox);
router.get('/export/:entity', checkPermission('master:view'), c.exportCsv);
router.post('/import-lookups', checkPermission('master:create'), c.importLookups);

// Generic resources
const RES = {
  'currency-rates': c.currencyRates, banks: c.banks, 'bank-accounts': c.bankAccounts,
  'fiscal-years': c.fiscalYears, 'period-locks': c.periodLocks, 'terms-conditions': c.termsConditions,
  'approval-settings': c.approvalSettings, 'vat-rates': c.vatRates, 'email-templates': c.emailTemplates,
  reminders: c.reminders, 'custom-fields': c.customFields, 'employee-rates': c.employeeRates,
};
for (const [name, h] of Object.entries(RES)) {
  router.get(`/${name}`, checkPermission('master:view'), h.list);
  router.post(`/${name}`, checkPermission('master:create'), h.create);
  router.put(`/${name}/:id`, checkPermission('master:create'), h.update);
  router.delete(`/${name}/:id`, checkPermission('master:delete'), h.remove);
}
module.exports = router;
