const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const authenticate = (req, res, next) => {
  const userId = req.headers['userid'];
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID is required' });
  }
  req.userId = userId;
  next();
};

// GET all notes for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new note
router.post('/', authenticate, async (req, res) => {
  const { title, content, characterCount } = req.body;
  const note = new Note({
    userId: req.userId,
    title,
    content,
    characterCount,
  });

  try {
    const newNote = await note.save();
    res.status(201).json(newNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET a single note
router.get('/:id', authenticate, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT (update) a note
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { title, content, characterCount } = req.body;
        const updatedNote = await Note.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { title, content, characterCount, updatedAt: Date.now() },
            { new: true }
        );
        if (!updatedNote) return res.status(404).json({ message: 'Note not found' });
        res.json(updatedNote);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// DELETE a note
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST to summarize a note's content
router.post('/summarize', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ message: 'Content to summarize is required' });
  }

  try {
    // --- NEW, IMPROVED PROMPT ---
    const prompt = `
You are an expert summarization assistant. Analyze the following note and provide a structured summary. Your response should be formatted exactly as follows, using Markdown for headers and bullet points:

### Summary
A concise paragraph that captures the main essence of the note.

### Key Takeaways
- A bulleted list of the most important points, ideas, or facts from the note.
- Each bullet point should be clear and to the point.

### Action Items
- A bulleted list of any tasks, to-dos, or actionable items mentioned in the note. If there are no action items, write "None".

Here is the note to summarize:
---
${content}
---
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ summary: response.text() });
  } catch (error) {
    console.error("Error with Gemini API:", error);
    res.status(500).json({ message: 'Error summarizing text', error: error.message });
  }
});

// POST to solve a question
router.post('/solve', authenticate, async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ message: 'A question is required' });
  }

  try {
    const prompt = `Provide a detailed, step-by-step explanation for the following academic question. If it's a multiple-choice question, identify the correct answer and explain why.\n\nQuestion: ${question}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ answer: response.text() });
  } catch (error) {
    res.status(500).json({ message: 'Error solving question', error: error.message });
  }
});


module.exports = router;
