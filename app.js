require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Routes
const waypointsRoutes = require('./routes/waypoints');
const pathsRoutes = require('./routes/paths');
const slopesRoutes = require('./routes/slopes');
// Import other routes as necessary

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB...');
  })
  .catch(err => console.error('Could not connect to MongoDB...', err));

app.use(cors());

// Middlewares
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Use routes
app.use('/api/waypoints', waypointsRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/slopes', slopesRoutes);

// A simple test route
app.get('/', (req, res) => {
  res.send('Welcome to Skier Mesh!');
});

// Starting the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
