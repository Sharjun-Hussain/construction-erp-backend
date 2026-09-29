const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesOrderController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.listSalesOrders);
router.get('/:id', ctrl.getSalesOrder);
router.post('/', ctrl.createSalesOrder);
router.put('/:id', ctrl.updateSalesOrder);
router.delete('/:id', ctrl.deleteSalesOrder);

module.exports = router;
