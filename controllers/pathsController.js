const Path = require('../models/Path');

exports.getAllPaths = async (req, res) => {
  try {
    const paths = await Path.find().populate('waypoints slopes lift');
    res.json(paths);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPath = async (req, res) => {
  const path = new Path({
    waypoints: req.body.waypoints,
    slopes: req.body.slopes,
    lift: req.body.lift,
    difficultyLevel: req.body.difficultyLevel,
    length: req.body.length
  });

  try {
    const newPath = await path.save();
    res.status(201).json(newPath);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getPathById = async (req, res) => {
  try {
    const path = await Path.findById(req.params.id).populate('waypoints slopes lift');
    if (!path) {
      return res.status(404).json({ message: 'Cannot find path' });
    }
    res.json(path);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePath = async (req, res) => {
  try {
    const path = await Path.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!path) {
      return res.status(404).json({ message: 'Cannot find path' });
    }
    res.json(path);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deletePath = async (req, res) => {
  try {
    const path = await Path.findByIdAndDelete(req.params.id);
    if (!path) {
      return res.status(404).json({ message: 'Cannot find path' });
    }
    res.json({ message: 'Deleted Path' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
