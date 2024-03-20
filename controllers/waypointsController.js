const Path = require('../models/Path');
const Slope = require('../models/Slope');
const Waypoint = require('../models/Waypoint');

exports.getShortestPath = async (req, res) => {
    const { path1Id, path2Id } = req.params; // Receive two path IDs as input

    try {
        // Find all slopes from the database
        const slopes = await Slope.find().populate('start end');

        // Create a map of slopes for easy lookup by start and end IDs
        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        // Initialize Dijkstra's algorithm
        const distances = new Map();
        const visited = new Set();
        const previous = new Map();

        // Initialize distances with Infinity, except for the start slope which has distance 0
        slopes.forEach((slope) => {
            distances.set(slope.start._id.toString(), Infinity);
            distances.set(slope.end._id.toString(), Infinity);
        });

        // Start slope
        const startSlopeId = path1Id;
        const endSlopeId = path2Id;
        distances.set(startSlopeId, 0);

        let reachableSlopes = slopes.length * 2; // Total number of reachable slopes

        while (reachableSlopes > 0) {
            // Get the slope with the smallest distance that hasn't been visited yet
            let currentSlopeId = null;
            let minDistance = Infinity;
            distances.forEach((distance, slopeId) => {
                if (!visited.has(slopeId) && distance < minDistance) {
                    currentSlopeId = slopeId;
                    minDistance = distance;
                }
            });

            // If no reachable slopes left, break
            if (currentSlopeId === null) break;

            // Mark current slope as visited
            visited.add(currentSlopeId);

            // Update distances to neighboring slopes
            const currentSlopes = slopeMap.get(currentSlopeId);
            if (currentSlopes) {
                // Add this check
                currentSlopes.forEach((currentSlope) => {
                    const neighborId = currentSlope.end._id.toString();
                    // Calculate weight based on length and incline
                    const weight = currentSlope.length * currentSlope.incline;
                    const totalDistance = distances.get(currentSlopeId) + weight;
                    if (totalDistance < distances.get(neighborId)) {
                        distances.set(neighborId, totalDistance);
                        previous.set(neighborId, currentSlopeId);
                    }
                });
            }
            reachableSlopes--; // Reduce the count of reachable slopes
        }

        // Reconstruct the shortest path
        let currentSlopeId = endSlopeId;
        const shortestPath = [];
        let totalLength = 0;
        let difficultyLevels = {};
        let waypoints = []; // Define an array to hold the waypoints
        while (currentSlopeId !== startSlopeId) {
            const prevSlopeId = previous.get(currentSlopeId);
            const prevSlopes = slopeMap.get(prevSlopeId);
            const currentSlope = prevSlopes.find(
                (slope) => slope.end._id.toString() === currentSlopeId
            );
            shortestPath.unshift(currentSlope);
            totalLength += currentSlope.length;
            difficultyLevels[currentSlope.difficultyLevel] =
                (difficultyLevels[currentSlope.difficultyLevel] || 0) + 1;
            waypoints.push(currentSlope.start._id); // Add the start waypoint of each slope to the array
            currentSlopeId = prevSlopeId;
        }

        // Add the end waypoint of the last slope
        waypoints.push(shortestPath[shortestPath.length - 1].end._id);

        // Determine the most common difficulty level
        let maxCount = 0;
        let commonDifficultyLevel = '';
        for (const [difficultyLevel, count] of Object.entries(difficultyLevels)) {
            if (count > maxCount) {
                maxCount = count;
                commonDifficultyLevel = difficultyLevel;
            }
        }
        

        // Return the shortest path in the Path model format
        res.json({
            waypoints: waypoints, // Use the waypoints array
            slopes: shortestPath,
            length: totalLength,
            difficultyLevel: commonDifficultyLevel,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllPaths = async (req, res) => {
    const { startId, endId } = req.params; // Receive start and end IDs as input

    try {
        // Find all slopes from the database
        const slopes = await Slope.find().populate('start end');

        // Create a map of slopes for easy lookup by start ID
        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        // Initialize an array to store all paths
        const allPaths = [];

        // Define a recursive function for DFS
        const dfs = (currentId, path) => {
            path.push(currentId);

            // If we reached the end, add the path to allPaths
            if (currentId === endId) {
                allPaths.push([...path]);
            } else {
                // Otherwise, continue the search on all neighboring slopes
                const currentSlopes = slopeMap.get(currentId);
                if (currentSlopes) {
                    currentSlopes.forEach((currentSlope) => {
                        const neighborId = currentSlope.end._id.toString();
                        if (!path.includes(neighborId)) {
                            dfs(neighborId, [...path, currentSlope]); // Include the current slope in the path
                        }
                    });
                }
            }

            // Backtrack
            path.pop();
        };

        // Start the DFS
        dfs(startId, []);
        // Return all paths
        res.json(allPaths);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllWaypoints = async (req, res) => {
    try {
        const waypoints = await Waypoint.find();
        res.json(waypoints);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createWaypoint = async (req, res) => {
    const waypoint = new Waypoint({
        coordinates: req.body.coordinates,
        name: req.body.name,
    });

    try {
        const newWaypoint = await waypoint.save();
        res.status(201).json(newWaypoint);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getWaypointById = async (req, res) => {
    try {
        const waypoint = await Waypoint.findById(req.params.id);
        if (!waypoint) {
            return res.status(404).json({ message: 'Cannot find waypoint' });
        }
        res.json(waypoint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateWaypoint = async (req, res) => {
    try {
        const waypoint = await Waypoint.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!waypoint) {
            return res.status(404).json({ message: 'Cannot find waypoint' });
        }
        res.json(waypoint);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteWaypoint = async (req, res) => {
    try {
        const waypoint = await Waypoint.findByIdAndDelete(req.params.id);
        if (!waypoint) {
            return res.status(404).json({ message: 'Cannot find waypoint' });
        }
        res.json({ message: 'Deleted Waypoint' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};