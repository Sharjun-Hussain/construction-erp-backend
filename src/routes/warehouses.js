const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/warehouseController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.listWarehouses);
router.get('/:id', ctrl.getWarehouse);
router.post('/', ctrl.createWarehouse);
router.put('/:id', ctrl.updateWarehouse);
router.delete('/:id', ctrl.deleteWarehouse);

module.exports = router;
