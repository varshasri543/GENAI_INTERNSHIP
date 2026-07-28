const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  citations: [{
    source: { type: String },
    page: { type: Number },
    preview: { type: String }
  }],
  feedback: {
    rating: { type: String, enum: ['up', 'down', 'none'], default: 'none' },
    comment: { type: String, default: '' }
  }
}, {
  timestamps: true
});

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true },
  title: { type: String, default: 'New Conversation' },
  messages: [MessageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', ChatSchema);
