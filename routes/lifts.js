const express = require('express');
const router = express.Router();
const liftsController = require('../controllers/liftsController');

router.get('/', liftsController.getAllLifts);
router.post('/', liftsController.createLift);
router.get('/:id', liftsController.getLiftById);
router.put('/:id', liftsController.updateLift);
router.delete('/:id', liftsController.deleteLift);

module.exports = router;
