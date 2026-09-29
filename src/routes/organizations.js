const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/organizationController');

// All organization management routes require authentication
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/deactivate', ctrl.deactivate);

module.exports = router;
