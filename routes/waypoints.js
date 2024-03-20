const express = require('express');
const router = express.Router();
const waypointsController = require('../controllers/waypointsController');

router.get('/', waypointsController.getAllWaypoints);
router.get('/shortestPath', waypointsController.getShortestPath);
router.post('/allPaths', waypointsController.getAllPaths);
router.post('/', waypointsController.createWaypoint);
router.get('/:id', waypointsController.getWaypointById);
router.put('/:id', waypointsController.updateWaypoint);
router.delete('/:id', waypointsController.deleteWaypoint);

module.exports = router;
