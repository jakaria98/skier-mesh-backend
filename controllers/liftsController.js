const Lift = require('../models/Lift');
const Slope = require('../models/Slope');
const Waypoint = require('../models/Waypoint');
exports.getAllLifts = async (req, res) => {
  try {
    const lifts = await Lift.find().populate('waypoints');
    res.json(lifts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.createLift = async (req, res) => {
  const lift = new Lift({
    liftID: req.body.liftID,
    name: req.body.name,
    type: req.body.type,
    capacity: req.body.capacity,
    status: req.body.status,
    travelTime: req.body.travelTime,
    waypoints: req.body.waypoints
  });

  try {
    const newLift = await lift.save();
    res.status(201).json(newLift);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getLiftById = async (req, res) => {
  try {
    const lift = await Lift.findById(req.params.id);
    if (lift == null) {
      return res.status(404).json({ message: 'Cannot find lift' });
    }
    res.json(lift);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateLift = async (req, res) => {
  try {
    const lift = await Lift.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(lift);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteLift = async (req, res) => {
  try {
    await Lift.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted Lift' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
