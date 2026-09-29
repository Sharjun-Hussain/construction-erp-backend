const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quotationController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.listQuotations);
router.get('/:id', ctrl.getQuotation);
router.post('/', ctrl.createQuotation);
router.put('/:id', ctrl.updateQuotation);
router.delete('/:id', ctrl.deleteQuotation);

module.exports = router;
