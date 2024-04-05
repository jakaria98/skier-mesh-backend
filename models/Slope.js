const mongoose = require('mongoose');

const slopeSchema = new mongoose.Schema({
    start: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Waypoint',
      required: true
    },
    end: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Waypoint',
      required: true
    },
    slopeName: String,
    difficultyLevel: String,
    length: Number,
    incline: Number
  });

  module.exports = mongoose.model('Slope', slopeSchema);