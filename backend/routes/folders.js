const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');

// Middleware to get user ID from header
const authenticate = (req, res, next) => {
  const userId = req.headers['userid'];
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID is required' });
  }
  req.userId = userId;
  next();
};

// GET all folders for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.userId }).sort({ name: 1 }); // Sort alphabetically
    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new folder
router.post('/', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Folder name is required.' });
  }

  const folder = new Folder({
    name: name.trim(),
    userId: req.userId,
  });

  try {
    const newFolder = await folder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
