const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Middleware to get user ID from header
const authenticate = (req, res, next) => {
  const userId = req.headers['userid'];
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID is required' });
  }
  req.userId = userId;
  next();
};

// GET all tasks for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new task
router.post('/', authenticate, async (req, res) => {
  const { title, date } = req.body;
  if (!title || !title.trim() || !date) {
    return res.status(400).json({ message: 'Task title and date are required.' });
  }

  const task = new Task({
    title: title.trim(),
    date: new Date(date),
    userId: req.userId,
  });

  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// --- NEW: DELETE a task ---
router.delete('/:id', authenticate, async (req, res) => {
    try {
      const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

module.exports = router;
