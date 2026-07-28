const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  rating: { type: String, enum: ['up', 'down'], required: true },
  comment: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
