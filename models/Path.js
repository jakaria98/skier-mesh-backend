const mongoose = require('mongoose');
const pathSchema = new mongoose.Schema({
    waypoints: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Waypoint'
    }],
    slopes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slope'
    }],
    lift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lift',
      required: false
    },
    difficultyLevel: String,
    length: Number
  });

  module.exports = mongoose.model('Path', pathSchema);
