const mongoose = require('mongoose');

const liftSchema = new mongoose.Schema({
    liftID: Number,
    name: String,
    type: String,
    capacity: Number,
    status: String,
    travelTime: Number,
    waypoints: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Waypoint'
    }]
  });

  module.exports = mongoose.model('Lift', liftSchema);
