const Slope = require('../models/Slope');

exports.getAllSlopes = async (req, res) => {
  try {
    const slopes = await Slope.find().populate('start end');
    res.json(slopes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSlope = async (req, res) => {
  const slope = new Slope({
    start: req.body.start,
    end: req.body.end,
    slopeName: req.body.slopeName,
    difficultyLevel: req.body.difficultyLevel,
    length: req.body.length,
    incline: req.body.incline
  });

  try {
    const newSlope = await slope.save();
    res.status(201).json(newSlope);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getSlopeById = async (req, res) => {
  try {
    const slope = await Slope.findById(req.params.id).populate('start end');
    if (slope == null) {
      return res.status(404).json({ message: 'Cannot find slope' });
    }
    res.json(slope);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateSlope = async (req, res) => {
  try {
    const slope = await Slope.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('start end');
    res.json(slope);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteSlope = async (req, res) => {
  try {
    await Slope.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted Slope' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};