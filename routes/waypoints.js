const express = require('express');
const router = express.Router();
const waypointsController = require('../controllers/waypointsController');

router.get('/', waypointsController.getAllWaypoints);
router.get('/shortestPath/:path1Id/:path2Id', waypointsController.getShortestPath);
router.get('/allPaths/:startId/:endId', waypointsController.getAllPaths);
router.post('/allByPathByDifficultyLevel', waypointsController.allByPathByDifficultyLevel);
router.post('/shortestPathbyTime', waypointsController.shortestPathbyTime);
router.post('/', waypointsController.createWaypoint);
router.get('/:id', waypointsController.getWaypointById);
router.put('/:id', waypointsController.updateWaypoint);
router.delete('/:id', waypointsController.deleteWaypoint);

module.exports = router;
