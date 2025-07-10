const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  characterCount: {
    type: Number,
    default: 0,
  },
  // --- NEW FIELD TO LINK NOTE TO A FOLDER ---
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null, // Notes can exist outside folders
  },
  // -----------------------------------------
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Note', NoteSchema);
