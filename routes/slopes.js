const express = require('express');
const router = express.Router();
const slopesController = require('../controllers/slopesController');

router.get('/', slopesController.getAllSlopes);
router.post('/', slopesController.createSlope);
router.get('/:id', slopesController.getSlopeById);
router.put('/:id', slopesController.updateSlope);
router.delete('/:id', slopesController.deleteSlope);

module.exports = router;