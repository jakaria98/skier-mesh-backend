const express = require('express');
const router = express.Router();
const pathsController = require('../controllers/pathsController');

router.get('/', pathsController.getAllPaths);
router.post('/', pathsController.createPath);
router.get('/:id', pathsController.getPathById);
router.put('/:id', pathsController.updatePath);
router.delete('/:id', pathsController.deletePath);

module.exports = router;
