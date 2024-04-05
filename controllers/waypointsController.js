const Path = require('../models/Path');
const Slope = require('../models/Slope');
const Waypoint = require('../models/Waypoint');
const Lift = require('../models/Lift');

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


exports.allByPathByDifficultyLevel = async (req, res) => {
    const { startWaypoint, endWaypoint, level1, level2, level3 } = req.body;

    try {
        // Initialize an array to store selected difficulty levels
        const selectedDifficultyLevels = [];
        if (level1) selectedDifficultyLevels.push('Level1');
        if (level2) selectedDifficultyLevels.push('Level2');
        if (level3) selectedDifficultyLevels.push('Level3');

        // If no difficulty levels are selected, return empty result
        if (selectedDifficultyLevels.length === 0) {
            return res.json(["Nothing to show"]);
        }

        // Find slopes from the database based on selected difficulty levels
        const slopes = await Slope.find({ difficultyLevel: { $in: selectedDifficultyLevels } }).populate('start end');

        // Find all lifts from the database
        const lifts = await Lift.find().populate('waypoints');

        // Create a map of slopes for easy lookup by start ID
        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        // Create a map of lifts for easy lookup by waypoint IDs
        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push(lift);
            });
        });
        console.log("Slopes and Lifts");
        console.log(slopeMap, liftMap);
        // Initialize an array to store all paths
        const allPaths = [];

        // Define a recursive function for DFS
        const dfs = (currentId, path) => {
            path.push(currentId);

            // If we reached the end, add the path to allPaths
            if (currentId === endWaypoint) {
                allPaths.push([...path]);
            } else {
                // Otherwise, continue the search on all neighboring slopes and lifts
                const currentSlopes = slopeMap.get(currentId) || [];
                currentSlopes.forEach((currentSlope) => {
                    const neighborId = currentSlope.end._id.toString();
                    if (!path.includes(neighborId)) {
                        dfs(neighborId, [...path, currentSlope]);
                    }
                });

                const currentLifts = liftMap.get(currentId) || [];
                currentLifts.forEach((currentLift) => {
                    currentLift.waypoints.forEach((waypoint) => {
                        const neighborId = waypoint._id.toString();
                        if (!path.includes(neighborId)) {
                            dfs(neighborId, [...path, currentLift]);
                        }
                    });
                });
            }

            // Backtrack
            path.pop();
        };

        // Start the DFS
        dfs(startWaypoint, []);

        // Return all paths
        res.json(allPaths);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const PriorityQueue = require('js-priority-queue');

const SLOPE_SPEED = 20; // km/hr

exports.shortestPathbyTime = async (req, res) => {
    const { startWaypoint, endWaypoint } = req.body;

    try {
        // Find all slopes from the database
        const slopes = await Slope.find().populate('start end');

        // Find all lifts from the database
        const lifts = await Lift.find().populate('waypoints');

        // Create a map of slopes for easy lookup by start ID
        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        // Create a map of lifts for easy lookup by waypoint IDs
        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint, index) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
            });
        });

        // Initialize distances map to store shortest distances
        const distances = new Map();

        // Initialize a priority queue for Dijkstra's algorithm
        const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] }); // Priority queue sorted by distance

        // Initialize start waypoint distance to 0 and add it to the priority queue
        distances.set(startWaypoint, 0);
        pq.queue([startWaypoint, 0]);

        // Initialize a map to store the previous node in the shortest path
        const previous = new Map();

        // Dijkstra's algorithm
        while (pq.length) {
            const [currentId, currentDistance] = pq.dequeue();

            // If we reached the end waypoint, break out of the loop
            if (currentId === endWaypoint) {
                break;
            }

            // If the current distance is greater than the stored distance, skip
            if (currentDistance > distances.get(currentId)) {
                continue;
            }

            // Check neighboring slopes
            const currentSlopes = slopeMap.get(currentId) || [];
            currentSlopes.forEach((currentSlope) => {
                const neighborId = currentSlope.end._id.toString();
                const length = currentSlope.length;
                const weight = (length / SLOPE_SPEED) * 60; // Convert hours to minutes

                const newDistance = currentDistance + weight;
                if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });

            // Check neighboring lifts
            const currentLifts = liftMap.get(currentId) || [];
            currentLifts.forEach(({ lift, index }) => {
                const { waypoints } = lift;
                const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
                const neighborId = waypoints[nextIndex]._id.toString();
                let weight = 0;
                switch (lift.liftType) {
                    case '6-chair lift':
                        weight = 7; // 7 minutes
                        break;
                    case 'T-Lift':
                        weight = 5; // 5 minutes
                        break;
                    case 'Gondola':
                        weight = 10; // 10 minutes
                        break;
                    default:
                        weight = 0; // Default weight (shouldn't happen)
                }

                const newDistance = currentDistance + weight;
                if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });
        }

        // Reconstruct shortest path
        const shortestPath = [];
        let current = endWaypoint;
        while (current !== startWaypoint) {
            shortestPath.unshift(current);
            current = previous.get(current);
        }
        shortestPath.unshift(startWaypoint);

        // Return shortest path
        res.json(shortestPath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.longestPathByTime = async (req, res) => {
    const { startWaypoint, endWaypoint } = req.body;

    try {
        // Define lift durations
        const LIFT_DURATIONS = {
            '6-chair lift': 7, // 7 minutes
            'T-Lift': 5, // 5 minutes
            'Gondola': 10 // 10 minutes
        };

        // Find all slopes from the database
        const slopes = await Slope.find().populate('start end');

        // Find all lifts from the database
        const lifts = await Lift.find().populate('waypoints');

        // Create a map of slopes for easy lookup by start ID
        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        // Create a map of lifts for easy lookup by waypoint IDs
        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint, index) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
            });
        });

        // Initialize distances map to store longest distances
        const distances = new Map();

        // Initialize a priority queue for Dijkstra's algorithm
        const pq = new PriorityQueue({ comparator: (a, b) => b[1] - a[1] }); // Priority queue sorted by distance (descending order)

        // Initialize distances for all waypoints to negative infinity except startWaypoint
        const waypoints = Array.from(slopeMap.keys()).concat(Array.from(liftMap.keys()));
        waypoints.forEach((waypoint) => {
            distances.set(waypoint, waypoint === startWaypoint ? 0 : Number.NEGATIVE_INFINITY);
            pq.queue([waypoint, distances.get(waypoint)]);
        });

        // Initialize a map to store the previous node in the longest path
        const previous = new Map();

        // Dijkstra's algorithm
        while (pq.length) {
            const [currentId, currentDistance] = pq.dequeue();

            // Check neighboring slopes
            const currentSlopes = slopeMap.get(currentId) || [];
            currentSlopes.forEach((currentSlope) => {
                const neighborId = currentSlope.end._id.toString();
                const length = currentSlope.length;
                const weight = (length / SLOPE_SPEED) * 60; // Convert hours to minutes

                const newDistance = currentDistance + weight;
                if (newDistance > distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });

            // Check neighboring lifts
            const currentLifts = liftMap.get(currentId) || [];
            currentLifts.forEach(({ lift, index }) => {
                const { waypoints } = lift;
                const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
                const neighborId = waypoints[nextIndex]._id.toString();
                const duration = LIFT_DURATIONS[lift.liftType]; // Get lift duration

                const newDistance = currentDistance + duration;
                if (newDistance > distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });
        }

        // Reconstruct longest path
        const longestPath = [];
        let current = endWaypoint;
        while (current !== startWaypoint) {
            longestPath.unshift(current);
            current = previous.get(current);
        }
        longestPath.unshift(startWaypoint);

        // Return longest path
        res.json(longestPath);
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
