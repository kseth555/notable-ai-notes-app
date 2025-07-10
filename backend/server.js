const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ['Content-Type', 'userid'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// --- FIX: Added the new route for folders ---
app.use('/api/notes', require('./routes/notes'));
app.use('/api/folders', require('./routes/folders')); // This line activates the folder API
app.use('/api/tasks', require('./routes/tasks'));
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
