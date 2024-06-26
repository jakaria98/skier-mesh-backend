const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  coordinates: {
    type: [Number],
    required: true,
  },
  name: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Waypoint', waypointSchema);
