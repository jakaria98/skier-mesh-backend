const mongoose = require('mongoose');
//this will be our route. in this iteration2 we will only return the static path
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
      required: false // Since a path might not always include a lift
    },
    difficultyLevel: String,
    length: Number
  });

  module.exports = mongoose.model('Path', pathSchema);
