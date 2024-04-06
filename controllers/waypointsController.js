const Path = require('../models/Path');
const Slope = require('../models/Slope');
const Waypoint = require('../models/Waypoint');
const Lift = require('../models/Lift');

exports.getShortestPath = async (req, res) => {
    const { path1Id, path2Id } = req.params;

    try {
        const slopes = await Slope.find().populate('start end');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        const distances = new Map();
        const visited = new Set();
        const previous = new Map();

        slopes.forEach((slope) => {
            distances.set(slope.start._id.toString(), Infinity);
            distances.set(slope.end._id.toString(), Infinity);
        });


        const startSlopeId = path1Id;
        const endSlopeId = path2Id;
        distances.set(startSlopeId, 0);

        let reachableSlopes = slopes.length * 2;

        while (reachableSlopes > 0) {
            let currentSlopeId = null;
            let minDistance = Infinity;
            distances.forEach((distance, slopeId) => {
                if (!visited.has(slopeId) && distance < minDistance) {
                    currentSlopeId = slopeId;
                    minDistance = distance;
                }
            });

            if (currentSlopeId === null) break;

            visited.add(currentSlopeId);

            const currentSlopes = slopeMap.get(currentSlopeId);
            if (currentSlopes) {
                currentSlopes.forEach((currentSlope) => {
                    const neighborId = currentSlope.end._id.toString();
                    const weight = currentSlope.length * currentSlope.incline;
                    const totalDistance = distances.get(currentSlopeId) + weight;
                    if (totalDistance < distances.get(neighborId)) {
                        distances.set(neighborId, totalDistance);
                        previous.set(neighborId, currentSlopeId);
                    }
                });
            }
            reachableSlopes--;
        }

        let currentSlopeId = endSlopeId;
        const shortestPath = [];
        let totalLength = 0;
        let difficultyLevels = {};
        let waypoints = [];
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
            waypoints.push(currentSlope.start._id);
            currentSlopeId = prevSlopeId;
        }

        waypoints.push(shortestPath[shortestPath.length - 1].end._id);

        let maxCount = 0;
        let commonDifficultyLevel = '';
        for (const [difficultyLevel, count] of Object.entries(difficultyLevels)) {
            if (count > maxCount) {
                maxCount = count;
                commonDifficultyLevel = difficultyLevel;
            }
        }


        res.json({
            waypoints: waypoints,
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
        const selectedDifficultyLevels = [];
        if (level1) selectedDifficultyLevels.push('Level1');
        if (level2) selectedDifficultyLevels.push('Level2');
        if (level3) selectedDifficultyLevels.push('Level3');

        if (selectedDifficultyLevels.length === 0) {
            return res.json(["Nothing to show"]);
        }

        const slopes = await Slope.find({ difficultyLevel: { $in: selectedDifficultyLevels } }).populate('start end');

        const lifts = await Lift.find().populate('waypoints');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

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
        const allPaths = [];

        const dfs = (currentId, path) => {
            path.push(currentId);

            if (currentId === endWaypoint) {
                allPaths.push([...path]);
            } else {
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

            path.pop();
        };

        dfs(startWaypoint, []);

        res.json(allPaths);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const PriorityQueue = require('js-priority-queue');

const SLOPE_SPEED = 20;
exports.shortestPathbyTime = async (req, res) => {
    const { startWaypoint, endWaypoint } = req.body;

    try {
        const slopes = await Slope.find().populate('start end');

        const lifts = await Lift.find().populate('waypoints');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint, index) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push({ lift, index });
            });
        });

        const distances = new Map();

        const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] });

        distances.set(startWaypoint, 0);
        pq.queue([startWaypoint, 0]);

        const previous = new Map();

        while (pq.length) {
            const [currentId, currentDistance] = pq.dequeue();

            if (currentId === endWaypoint) {
                break;
            }

            if (currentDistance > distances.get(currentId)) {
                continue;
            }

            const currentSlopes = slopeMap.get(currentId) || [];
            currentSlopes.forEach((currentSlope) => {
                const neighborId = currentSlope.end._id.toString();
                const length = currentSlope.length;
                const weight = (length / SLOPE_SPEED) * 60;

                const newDistance = currentDistance + weight;
                if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });

            const currentLifts = liftMap.get(currentId) || [];
            currentLifts.forEach(({ lift, index }) => {
                const { waypoints } = lift;
                const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1;
                const neighborId = waypoints[nextIndex]._id.toString();
                let weight = 0;
                switch (lift.liftType) {
                    case '6-chair lift':
                        weight = 7;
                        break;
                    case 'T-Lift':
                        weight = 5;
                        break;
                    case 'Gondola':
                        weight = 10;
                        break;
                    default:
                        weight = 0;
                }

                const newDistance = currentDistance + weight;
                if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });
        }

        const shortestPath = [];
        let current = endWaypoint;
        while (current !== startWaypoint) {
            shortestPath.unshift(current);
            current = previous.get(current);
        }
        shortestPath.unshift(startWaypoint);

        const formattedShortestPath = [];
        for (let i = 0; i < shortestPath.length - 1; i++) {
            const currentId = shortestPath[i];
            const nextId = shortestPath[i + 1];
            const slope = slopes.find(s => s.start._id.toString() === currentId && s.end._id.toString() === nextId);
            if (slope) {
                formattedShortestPath.push(currentId);
                formattedShortestPath.push(slope);
            } else {
                const lift = lifts.find(l => {
                    const waypointIds = l.waypoints.map(wp => wp._id.toString());
                    return waypointIds.includes(currentId) && waypointIds.includes(nextId);
                });
                if (lift) {
                    formattedShortestPath.push(currentId);
                    formattedShortestPath.push(lift);
                }
            }
        }
        formattedShortestPath.push(endWaypoint);

        res.json(formattedShortestPath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// exports.shortestPathbyTime = async (req, res) => {
//     const { startWaypoint, endWaypoint } = req.body;

//     try {
//         // Find all slopes from the database
//         const slopes = await Slope.find().populate('start end');

//         // Find all lifts from the database
//         const lifts = await Lift.find().populate('waypoints');

//         // Create a map of slopes for easy lookup by start ID
//         const slopeMap = new Map();
//         slopes.forEach((slope) => {
//             if (!slopeMap.has(slope.start._id.toString())) {
//                 slopeMap.set(slope.start._id.toString(), []);
//             }
//             slopeMap.get(slope.start._id.toString()).push(slope);
//         });

//         // Create a map of lifts for easy lookup by waypoint IDs
//         const liftMap = new Map();
//         lifts.forEach((lift) => {
//             lift.waypoints.forEach((waypoint, index) => {
//                 const waypointId = waypoint._id.toString();
//                 if (!liftMap.has(waypointId)) {
//                     liftMap.set(waypointId, []);
//                 }
//                 liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
//             });
//         });

//         // Initialize distances map to store shortest distances
//         const distances = new Map();

//         // Initialize a priority queue for Dijkstra's algorithm
//         const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] }); // Priority queue sorted by distance

//         // Initialize start waypoint distance to 0 and add it to the priority queue
//         distances.set(startWaypoint, 0);
//         pq.queue([startWaypoint, 0]);

//         // Initialize a map to store the previous node in the shortest path
//         const previous = new Map();

//         // Dijkstra's algorithm
//         while (pq.length) {
//             const [currentId, currentDistance] = pq.dequeue();

//             // If we reached the end waypoint, break out of the loop
//             if (currentId === endWaypoint) {
//                 break;
//             }

//             // If the current distance is greater than the stored distance, skip
//             if (currentDistance > distances.get(currentId)) {
//                 continue;
//             }

//             // Check neighboring slopes
//             const currentSlopes = slopeMap.get(currentId) || [];
//             currentSlopes.forEach((currentSlope) => {
//                 const neighborId = currentSlope.end._id.toString();
//                 const length = currentSlope.length;
//                 const weight = (length / SLOPE_SPEED) * 60; // Convert hours to minutes

//                 const newDistance = currentDistance + weight;
//                 if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
//                     distances.set(neighborId, newDistance);
//                     pq.queue([neighborId, newDistance]);
//                     previous.set(neighborId, currentId);
//                 }
//             });

//             // Check neighboring lifts
//             const currentLifts = liftMap.get(currentId) || [];
//             currentLifts.forEach(({ lift, index }) => {
//                 const { waypoints } = lift;
//                 const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
//                 const neighborId = waypoints[nextIndex]._id.toString();
//                 let weight = 0;
//                 switch (lift.liftType) {
//                     case '6-chair lift':
//                         weight = 7; // 7 minutes
//                         break;
//                     case 'T-Lift':
//                         weight = 5; // 5 minutes
//                         break;
//                     case 'Gondola':
//                         weight = 10; // 10 minutes
//                         break;
//                     default:
//                         weight = 0; // Default weight (shouldn't happen)
//                 }

//                 const newDistance = currentDistance + weight;
//                 if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
//                     distances.set(neighborId, newDistance);
//                     pq.queue([neighborId, newDistance]);
//                     previous.set(neighborId, currentId);
//                 }
//             });
//         }

//         // Reconstruct shortest path
//         const shortestPath = [];
//         let current = endWaypoint;
//         while (current !== startWaypoint) {
//             shortestPath.unshift(current);
//             current = previous.get(current);
//         }
//         shortestPath.unshift(startWaypoint);

//         // Transform shortest path to match the output format of allByPathByDifficultyLevel
//         const formattedShortestPath = shortestPath.map((waypointId) => {
//             const slope = slopes.find((slope) => slope.start._id.toString() === waypointId);
//             if (slope) {
//                 return { slope };
//             } else {
//                 const lift = lifts.find((lift) => lift.waypoints.some((waypoint) => waypoint._id.toString() === waypointId));
//                 return { lift };
//             }
//         });

//         // Return shortest path
//         res.json(formattedShortestPath);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

// exports.shortestPathbyTime = async (req, res) => {
//     const { startWaypoint, endWaypoint } = req.body;

//     try {
//         // Find all slopes from the database
//         const slopes = await Slope.find().populate('start end');

//         // Find all lifts from the database
//         const lifts = await Lift.find().populate('waypoints');

//         // Create a map of slopes for easy lookup by start ID
//         const slopeMap = new Map();
//         slopes.forEach((slope) => {
//             if (!slopeMap.has(slope.start._id.toString())) {
//                 slopeMap.set(slope.start._id.toString(), []);
//             }
//             slopeMap.get(slope.start._id.toString()).push(slope);
//         });

//         // Create a map of lifts for easy lookup by waypoint IDs
//         const liftMap = new Map();
//         lifts.forEach((lift) => {
//             lift.waypoints.forEach((waypoint, index) => {
//                 const waypointId = waypoint._id.toString();
//                 if (!liftMap.has(waypointId)) {
//                     liftMap.set(waypointId, []);
//                 }
//                 liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
//             });
//         });

//         // Initialize distances map to store shortest distances
//         const distances = new Map();

//         // Initialize a priority queue for Dijkstra's algorithm
//         const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] }); // Priority queue sorted by distance

//         // Initialize start waypoint distance to 0 and add it to the priority queue
//         distances.set(startWaypoint, 0);
//         pq.queue([startWaypoint, 0]);

//         // Initialize a map to store the previous node in the shortest path
//         const previous = new Map();

//         // Dijkstra's algorithm
//         while (pq.length) {
//             const [currentId, currentDistance] = pq.dequeue();

//             // If we reached the end waypoint, break out of the loop
//             if (currentId === endWaypoint) {
//                 break;
//             }

//             // If the current distance is greater than the stored distance, skip
//             if (currentDistance > distances.get(currentId)) {
//                 continue;
//             }

//             // Check neighboring slopes
//             const currentSlopes = slopeMap.get(currentId) || [];
//             currentSlopes.forEach((currentSlope) => {
//                 const neighborId = currentSlope.end._id.toString();
//                 const length = currentSlope.length;
//                 const weight = (length / SLOPE_SPEED) * 60; // Convert hours to minutes

//                 const newDistance = currentDistance + weight;
//                 if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
//                     distances.set(neighborId, newDistance);
//                     pq.queue([neighborId, newDistance]);
//                     previous.set(neighborId, currentId);
//                 }
//             });

//             // Check neighboring lifts
//             const currentLifts = liftMap.get(currentId) || [];
//             currentLifts.forEach(({ lift, index }) => {
//                 const { waypoints } = lift;
//                 const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
//                 const neighborId = waypoints[nextIndex]._id.toString();
//                 let weight = 0;
//                 switch (lift.liftType) {
//                     case '6-chair lift':
//                         weight = 7; // 7 minutes
//                         break;
//                     case 'T-Lift':
//                         weight = 5; // 5 minutes
//                         break;
//                     case 'Gondola':
//                         weight = 10; // 10 minutes
//                         break;
//                     default:
//                         weight = 0; // Default weight (shouldn't happen)
//                 }

//                 const newDistance = currentDistance + weight;
//                 if (!distances.has(neighborId) || newDistance < distances.get(neighborId)) {
//                     distances.set(neighborId, newDistance);
//                     pq.queue([neighborId, newDistance]);
//                     previous.set(neighborId, currentId);
//                 }
//             });
//         }

//         // Reconstruct shortest path
//         const shortestPath = [];
//         let current = endWaypoint;
//         while (current !== startWaypoint) {
//             shortestPath.unshift(current);
//             current = previous.get(current);
//         }
//         shortestPath.unshift(startWaypoint);

//         // Return shortest path
//         res.json(shortestPath);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

// exports.longestPathByTime = async (req, res) => {
//     const { startWaypoint, endWaypoint } = req.body;

//     try {
//         // Define lift durations
//         const LIFT_DURATIONS = {
//             '6-chair lift': 7, // 7 minutes
//             'T-Lift': 5, // 5 minutes
//             'Gondola': 10 // 10 minutes
//         };

//         // Find all slopes from the database
//         const slopes = await Slope.find().populate('start end');

//         // Find all lifts from the database
//         const lifts = await Lift.find().populate('waypoints');

//         // Create a map of slopes for easy lookup by start ID
//         const slopeMap = new Map();
//         slopes.forEach((slope) => {
//             if (!slopeMap.has(slope.start._id.toString())) {
//                 slopeMap.set(slope.start._id.toString(), []);
//             }
//             slopeMap.get(slope.start._id.toString()).push(slope);
//         });

//         // Create a map of lifts for easy lookup by waypoint IDs
//         const liftMap = new Map();
//         lifts.forEach((lift) => {
//             lift.waypoints.forEach((waypoint, index) => {
//                 const waypointId = waypoint._id.toString();
//                 if (!liftMap.has(waypointId)) {
//                     liftMap.set(waypointId, []);
//                 }
//                 liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
//             });
//         });

//         // Initialize distances map to store longest distances
//         const distances = new Map();

//         // Initialize a priority queue for Dijkstra's algorithm
//         const pq = new PriorityQueue({ comparator: (a, b) => b[1] - a[1] }); // Priority queue sorted by distance (descending order)

//         // Initialize distances for all waypoints to negative infinity except startWaypoint
//         const waypoints = Array.from(slopeMap.keys()).concat(Array.from(liftMap.keys()));
//         waypoints.forEach((waypoint) => {
//             distances.set(waypoint, waypoint === startWaypoint ? 0 : Number.NEGATIVE_INFINITY);
//             pq.queue([waypoint, distances.get(waypoint)]);
//         });

//         // Initialize a map to store the previous node in the longest path
//         const previous = new Map();

//         // Dijkstra's algorithm
//         while (pq.length) {
//             const [currentId, currentDistance] = pq.dequeue();

//             // Check neighboring slopes
//             const currentSlopes = slopeMap.get(currentId) || [];
//             currentSlopes.forEach((currentSlope) => {
//                 const neighborId = currentSlope.end._id.toString();
//                 const length = currentSlope.length;
//                 const weight = (length / SLOPE_SPEED) * 60; // Convert hours to minutes

//                 const newDistance = currentDistance + weight;
//                 if (newDistance > distances.get(neighborId)) {
//                     distances.set(neighborId, newDistance);
//                     pq.queue([neighborId, newDistance]);
//                     previous.set(neighborId, currentId);
//                 }
//             });

//             // Check neighboring lifts
//             const currentLifts = liftMap.get(currentId) || [];
//             currentLifts.forEach(({ lift, index }) => {
//                 const { waypoints } = lift;
//                 const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
//                 const neighborId = waypoints[nextIndex]._id.toString();
//                 const duration = LIFT_DURATIONS[lift.liftType]; // Get lift duration

//                 const newDistance = currentDistance + duration;
//                 if (newDistance > distances.get(neighborId)) {
//                     distances.set(neighborId, newDistance);
//                     pq.queue([neighborId, newDistance]);
//                     previous.set(neighborId, currentId);
//                 }
//             });
//         }

//         // Reconstruct longest path
//         const longestPath = [];
//         let current = endWaypoint;
//         while (current !== startWaypoint) {
//             longestPath.unshift(current);
//             current = previous.get(current);
//         }
//         longestPath.unshift(startWaypoint);

//         // Return longest path
//         res.json(longestPath);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

exports.longestPathByTime = async (req, res) => {
    const { startWaypoint, endWaypoint } = req.body;

    try {
        const LIFT_DURATIONS = {
            '6-chair lift': 7,
            'T-Lift': 5,
            'Gondola': 10
        };

        const slopes = await Slope.find().populate('start end');

        const lifts = await Lift.find().populate('waypoints');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });


        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint, index) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push({ lift, index });
            });
        });

        const distances = new Map();

        const pq = new PriorityQueue({ comparator: (a, b) => b[1] - a[1] });

        const waypoints = Array.from(slopeMap.keys()).concat(Array.from(liftMap.keys()));
        waypoints.forEach((waypoint) => {
            distances.set(waypoint, waypoint === startWaypoint ? 0 : Number.NEGATIVE_INFINITY);
            pq.queue([waypoint, distances.get(waypoint)]);
        });

        const previous = new Map();

        while (pq.length) {
            const [currentId, currentDistance] = pq.dequeue();

            const currentSlopes = slopeMap.get(currentId) || [];
            currentSlopes.forEach((currentSlope) => {
                const neighborId = currentSlope.end._id.toString();
                const length = currentSlope.length;
                const weight = (length / SLOPE_SPEED) * 60;

                const newDistance = currentDistance + weight;
                if (newDistance > distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });

            const currentLifts = liftMap.get(currentId) || [];
            currentLifts.forEach(({ lift, index }) => {
                const { waypoints } = lift;
                const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1;
                const neighborId = waypoints[nextIndex]._id.toString();
                const duration = LIFT_DURATIONS[lift.liftType];

                const newDistance = currentDistance + duration;
                if (newDistance > distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    pq.queue([neighborId, newDistance]);
                    previous.set(neighborId, currentId);
                }
            });
        }

        const longestPath = [];
        let current = endWaypoint;
        while (current !== startWaypoint) {
            longestPath.unshift(current);
            current = previous.get(current);
        }
        longestPath.unshift(startWaypoint);

        const formattedLongestPath = [];
        for (let i = 0; i < longestPath.length - 1; i++) {
            const currentId = longestPath[i];
            const nextId = longestPath[i + 1];
            const slope = slopes.find(s => s.start._id.toString() === currentId && s.end._id.toString() === nextId);
            if (slope) {
                formattedLongestPath.push(currentId);
                formattedLongestPath.push(slope);
            } else {
                const lift = lifts.find(l => {
                    const waypointIds = l.waypoints.map(wp => wp._id.toString());
                    return waypointIds.includes(currentId) && waypointIds.includes(nextId);
                });
                if (lift) {
                    formattedLongestPath.push(currentId);
                    formattedLongestPath.push(lift);
                }
            }
        }
        formattedLongestPath.push(endWaypoint);

        res.json(formattedLongestPath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



// exports.easiestPath = async (req, res) => {
//     const { startWaypoint, endWaypoint } = req.body;

//     try {
//         // Define difficulty level weights
//         const DIFFICULTY_WEIGHTS = {
//             'level1': 1,
//             'level2': 2,
//             'level3': 3
//         };

//         // Find all slopes from the database
//         const slopes = await Slope.find().populate('start end');

//         // Find all lifts from the database
//         const lifts = await Lift.find().populate('waypoints');

//         // Create a map of slopes for easy lookup by start ID
//         const slopeMap = new Map();
//         slopes.forEach((slope) => {
//             if (!slopeMap.has(slope.start._id.toString())) {
//                 slopeMap.set(slope.start._id.toString(), []);
//             }
//             slopeMap.get(slope.start._id.toString()).push(slope);
//         });

//         // Create a map of lifts for easy lookup by waypoint IDs
//         const liftMap = new Map();
//         lifts.forEach((lift) => {
//             lift.waypoints.forEach((waypoint, index) => {
//                 const waypointId = waypoint._id.toString();
//                 if (!liftMap.has(waypointId)) {
//                     liftMap.set(waypointId, []);
//                 }
//                 liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
//             });
//         });

//         // Initialize distances map to store least difficulty level weights
//         const weights = new Map();

//         // Initialize a priority queue for Dijkstra's algorithm
//         const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] }); // Priority queue sorted by weight

//         // Initialize start waypoint weight to 0 and add it to the priority queue
//         weights.set(startWaypoint, 0);
//         pq.queue([startWaypoint, 0]);

//         // Initialize a map to store the previous node in the easiest path
//         const previous = new Map();

//         // Dijkstra's algorithm
//         while (pq.length) {
//             const [currentId, currentWeight] = pq.dequeue();

//             // If we reached the end waypoint, break out of the loop
//             if (currentId === endWaypoint) {
//                 break;
//             }

//             // Check neighboring slopes
//             const currentSlopes = slopeMap.get(currentId) || [];
//             currentSlopes.forEach((currentSlope) => {
//                 const neighborId = currentSlope.end._id.toString();
//                 const difficultyLevel = currentSlope.difficultyLevel;

//                 const newWeight = currentWeight + DIFFICULTY_WEIGHTS[difficultyLevel];
//                 if (!weights.has(neighborId) || newWeight < weights.get(neighborId)) {
//                     weights.set(neighborId, newWeight);
//                     pq.queue([neighborId, newWeight]);
//                     previous.set(neighborId, currentId);
//                 }
//             });

//             // Check neighboring lifts
//             const currentLifts = liftMap.get(currentId) || [];
//             currentLifts.forEach(({ lift, index }) => {
//                 const { waypoints } = lift;
//                 const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
//                 const neighborId = waypoints[nextIndex]._id.toString();

//                 const difficultyLevel = 'lift'; // Assume lift difficulty level as 'lift'

//                 const newWeight = currentWeight + DIFFICULTY_WEIGHTS[difficultyLevel];
//                 if (!weights.has(neighborId) || newWeight < weights.get(neighborId)) {
//                     weights.set(neighborId, newWeight);
//                     pq.queue([neighborId, newWeight]);
//                     previous.set(neighborId, currentId);
//                 }
//             });
//         }

//         // Reconstruct easiest path
//         const easiestPath = [];
//         let current = endWaypoint;
//         while (current !== startWaypoint) {
//             easiestPath.unshift(current);
//             current = previous.get(current);
//         }
//         easiestPath.unshift(startWaypoint);

//         // Return easiest path
//         res.json(easiestPath);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

exports.easiestPath = async (req, res) => {
    const { startWaypoint, endWaypoint } = req.body;

    try {
        const DIFFICULTY_WEIGHTS = {
            'Level1': 1,
            'Level2': 2,
            'Level3': 3
        };

        const slopes = await Slope.find().populate('start end');

        const lifts = await Lift.find().populate('waypoints');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint, index) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push({ lift, index });
            });
        });

        const weights = new Map();

        const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] });


        weights.set(startWaypoint, 0);
        pq.queue([startWaypoint, 0]);

        const previous = new Map();

        while (pq.length) {
            const [currentId, currentWeight] = pq.dequeue();

            if (currentId === endWaypoint) {
                break;
            }

            const currentSlopes = slopeMap.get(currentId) || [];
            currentSlopes.forEach((currentSlope) => {
                const neighborId = currentSlope.end._id.toString();
                const difficultyLevel = currentSlope.difficultyLevel;

                const newWeight = currentWeight + DIFFICULTY_WEIGHTS[difficultyLevel];
                if (!weights.has(neighborId) || newWeight < weights.get(neighborId)) {
                    weights.set(neighborId, newWeight);
                    pq.queue([neighborId, newWeight]);
                    previous.set(neighborId, { id: currentId, type: 'slope', slope: currentSlope });
                }
            });

            const currentLifts = liftMap.get(currentId) || [];
            currentLifts.forEach(({ lift, index }) => {
                const { waypoints } = lift;
                const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1;
                const neighborId = waypoints[nextIndex]._id.toString();

                const difficultyLevel = 'lift';

                const newWeight = currentWeight + DIFFICULTY_WEIGHTS[difficultyLevel];
                if (!weights.has(neighborId) || newWeight < weights.get(neighborId)) {
                    weights.set(neighborId, newWeight);
                    pq.queue([neighborId, newWeight]);
                    previous.set(neighborId, { id: currentId, type: 'lift', lift });
                }
            });
        }

        const easiestPath = [];
        let current = endWaypoint;
        while (current !== startWaypoint) {
            easiestPath.unshift(current);
            current = previous.get(current).id;
        }
        easiestPath.unshift(startWaypoint);

        const formattedEasiestPath = [];
        for (let i = 0; i < easiestPath.length - 1; i++) {
            const currentId = easiestPath[i];
            const nextId = easiestPath[i + 1];
            const prevNode = previous.get(nextId);
            if (prevNode.type === 'slope') {
                formattedEasiestPath.push(currentId, prevNode.slope, nextId);
            } else {
                formattedEasiestPath.push(currentId, prevNode.lift, nextId);
            }
        }

        res.json(formattedEasiestPath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.minLiftUsagePath = async (req, res) => {
    const { startWaypoint, endWaypoint } = req.body;

    try {
        const LIFT_TYPE_WEIGHTS = {
            '6-chair lift': 1,
            'T-Lift': 1,
            'Gondola': 2
        };

        const slopes = await Slope.find().populate('start end');

        const lifts = await Lift.find().populate('waypoints');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        const liftMap = new Map();
        lifts.forEach((lift) => {
            lift.waypoints.forEach((waypoint, index) => {
                const waypointId = waypoint._id.toString();
                if (!liftMap.has(waypointId)) {
                    liftMap.set(waypointId, []);
                }
                liftMap.get(waypointId).push({ lift, index });
            });
        });

        const liftUsage = new Map();

        const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] });

        liftUsage.set(startWaypoint, 0);
        pq.queue([startWaypoint, 0]);

        const previous = new Map();

        while (pq.length) {
            const [currentId, currentLiftUsage] = pq.dequeue();

            if (currentId === endWaypoint) {
                break;
            }

            const currentSlopes = slopeMap.get(currentId) || [];
            currentSlopes.forEach((currentSlope) => {
                const neighborId = currentSlope.end._id.toString();

                const newLiftUsage = currentLiftUsage;
                if (!liftUsage.has(neighborId) || newLiftUsage < liftUsage.get(neighborId)) {
                    liftUsage.set(neighborId, newLiftUsage);
                    pq.queue([neighborId, newLiftUsage]);
                    previous.set(neighborId, currentId);
                }
            });

            const currentLifts = liftMap.get(currentId) || [];
            currentLifts.forEach(({ lift, index }) => {
                const { waypoints } = lift;
                const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1;
                const neighborId = waypoints[nextIndex]._id.toString();
                const liftType = lift.liftType;

                const newLiftUsage = currentLiftUsage + LIFT_TYPE_WEIGHTS[liftType];
                if (!liftUsage.has(neighborId) || newLiftUsage < liftUsage.get(neighborId)) {
                    liftUsage.set(neighborId, newLiftUsage);
                    pq.queue([neighborId, newLiftUsage]);
                    previous.set(neighborId, currentId);
                }
            });
        }

        const minLiftUsagePath = [];
        let current = endWaypoint;
        while (current !== startWaypoint) {
            minLiftUsagePath.unshift(current);
            current = previous.get(current);
        }
        minLiftUsagePath.unshift(startWaypoint);

        const formattedMinLiftUsagePath = [];
        for (let i = 0; i < minLiftUsagePath.length - 1; i++) {
            const currentId = minLiftUsagePath[i];
            const nextId = minLiftUsagePath[i + 1];
            const slope = slopes.find(s => s.start._id.toString() === currentId && s.end._id.toString() === nextId);
            if (slope) {
                formattedMinLiftUsagePath.push(currentId);
                formattedMinLiftUsagePath.push(slope);
            } else {
                const lift = lifts.find(l => {
                    const waypointIds = l.waypoints.map(wp => wp._id.toString());
                    return waypointIds.includes(currentId) && waypointIds.includes(nextId);
                });
                if (lift) {
                    formattedMinLiftUsagePath.push(currentId);
                    formattedMinLiftUsagePath.push(lift);
                }
            }
        }
        formattedMinLiftUsagePath.push(endWaypoint);

        res.json(formattedMinLiftUsagePath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// exports.minLiftUsagePath = async (req, res) => {
//     const { startWaypoint, endWaypoint } = req.body;

//     try {
//         // Define lift type weights
//         const LIFT_TYPE_WEIGHTS = {
//             '6-chair lift': 1,
//             'T-Lift': 1,
//             'Gondola': 2
//         };

//         // Find all slopes from the database
//         const slopes = await Slope.find().populate('start end');

//         // Find all lifts from the database
//         const lifts = await Lift.find().populate('waypoints');

//         // Create a map of slopes for easy lookup by start ID
//         const slopeMap = new Map();
//         slopes.forEach((slope) => {
//             if (!slopeMap.has(slope.start._id.toString())) {
//                 slopeMap.set(slope.start._id.toString(), []);
//             }
//             slopeMap.get(slope.start._id.toString()).push(slope);
//         });

//         // Create a map of lifts for easy lookup by waypoint IDs
//         const liftMap = new Map();
//         lifts.forEach((lift) => {
//             lift.waypoints.forEach((waypoint, index) => {
//                 const waypointId = waypoint._id.toString();
//                 if (!liftMap.has(waypointId)) {
//                     liftMap.set(waypointId, []);
//                 }
//                 liftMap.get(waypointId).push({ lift, index }); // Include index for directionality
//             });
//         });

//         // Initialize lift usage map to store minimum lift usage
//         const liftUsage = new Map();

//         // Initialize a priority queue for Dijkstra's algorithm
//         const pq = new PriorityQueue({ comparator: (a, b) => a[1] - b[1] }); // Priority queue sorted by lift usage

//         // Initialize start waypoint lift usage to 0 and add it to the priority queue
//         liftUsage.set(startWaypoint, 0);
//         pq.queue([startWaypoint, 0]);

//         // Initialize a map to store the previous node in the path with minimum lift usage
//         const previous = new Map();

//         // Dijkstra's algorithm
//         while (pq.length) {
//             const [currentId, currentLiftUsage] = pq.dequeue();

//             // If we reached the end waypoint, break out of the loop
//             if (currentId === endWaypoint) {
//                 break;
//             }

//             // Check neighboring slopes
//             const currentSlopes = slopeMap.get(currentId) || [];
//             currentSlopes.forEach((currentSlope) => {
//                 const neighborId = currentSlope.end._id.toString();

//                 const newLiftUsage = currentLiftUsage;
//                 if (!liftUsage.has(neighborId) || newLiftUsage < liftUsage.get(neighborId)) {
//                     liftUsage.set(neighborId, newLiftUsage);
//                     pq.queue([neighborId, newLiftUsage]);
//                     previous.set(neighborId, currentId);
//                 }
//             });

//             // Check neighboring lifts
//             const currentLifts = liftMap.get(currentId) || [];
//             currentLifts.forEach(({ lift, index }) => {
//                 const { waypoints } = lift;
//                 const nextIndex = index + 1 < waypoints.length ? index + 1 : index - 1; // Check next waypoint in both directions
//                 const neighborId = waypoints[nextIndex]._id.toString();
//                 const liftType = lift.liftType;

//                 const newLiftUsage = currentLiftUsage + LIFT_TYPE_WEIGHTS[liftType];
//                 if (!liftUsage.has(neighborId) || newLiftUsage < liftUsage.get(neighborId)) {
//                     liftUsage.set(neighborId, newLiftUsage);
//                     pq.queue([neighborId, newLiftUsage]);
//                     previous.set(neighborId, currentId);
//                 }
//             });
//         }

//         // Reconstruct path with minimum lift usage
//         const minLiftUsagePath = [];
//         let current = endWaypoint;
//         while (current !== startWaypoint) {
//             minLiftUsagePath.unshift(current);
//             current = previous.get(current);
//         }
//         minLiftUsagePath.unshift(startWaypoint);

//         // Return path with minimum lift usage
//         res.json(minLiftUsagePath);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };


exports.getAllPaths = async (req, res) => {
    const { startId, endId } = req.params;

    try {
        const slopes = await Slope.find().populate('start end');

        const slopeMap = new Map();
        slopes.forEach((slope) => {
            if (!slopeMap.has(slope.start._id.toString())) {
                slopeMap.set(slope.start._id.toString(), []);
            }
            slopeMap.get(slope.start._id.toString()).push(slope);
        });

        const allPaths = [];

        const dfs = (currentId, path) => {
            path.push(currentId);

            if (currentId === endId) {
                allPaths.push([...path]);
            } else {
                const currentSlopes = slopeMap.get(currentId);
                if (currentSlopes) {
                    currentSlopes.forEach((currentSlope) => {
                        const neighborId = currentSlope.end._id.toString();
                        if (!path.includes(neighborId)) {
                            dfs(neighborId, [...path, currentSlope]);
                        }
                    });
                }
            }

            path.pop();
        };

        dfs(startId, []);
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
