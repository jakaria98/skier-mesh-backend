require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const waypointsRoutes = require('./routes/waypoints');
const pathsRoutes = require('./routes/paths');
const slopesRoutes = require('./routes/slopes');
const liftsRoutes = require('./routes/lifts');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB...');
  })
  .catch(err => console.error('Could not connect to MongoDB...', err));

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/waypoints', waypointsRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/slopes', slopesRoutes);
app.use('/api/lifts', liftsRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to Skier Mesh!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
