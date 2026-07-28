const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Chat = require('../models/Chat');
const Feedback = require('../models/Feedback');
const fs = require('fs');
const path = require('path');

const DOCUMENTS_DIR = path.join(__dirname, '..', '..', 'documents');

// Get statistics for the dashboard
exports.getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAppointments = await Appointment.countDocuments();
    const totalChats = await Chat.countDocuments();
    const totalFeedback = await Feedback.countDocuments();
    
    const positiveFeedback = await Feedback.countDocuments({ rating: 'up' });
    const satisfactionRate = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 100;

    // Get booking stats by status
    const scheduledCount = await Appointment.countDocuments({ status: 'scheduled' });
    const cancelledCount = await Appointment.countDocuments({ status: 'cancelled' });
    const rescheduledCount = await Appointment.countDocuments({ status: 'rescheduled' });

    res.json({
      metrics: {
        totalUsers,
        totalAppointments,
        totalChats,
        satisfactionRate
      },
      appointmentsBreakdown: {
        scheduled: scheduledCount,
        cancelled: cancelledCount,
        rescheduled: rescheduledCount
      }
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    res.status(500).json({ detail: 'Server error retrieving system analytics.' });
  }
};

// List all files in the documents folder
exports.listDocuments = async (req, res) => {
  try {
    const docsDir = path.resolve(__dirname, '../../documents');
    if (!fs.existsSync(docsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(docsDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    const documentList = pdfFiles.map(file => {
      const stats = fs.statSync(path.join(docsDir, file));
      return {
        name: file,
        sizeBytes: stats.size,
        createdAt: stats.birthtime
      };
    });

    res.json(documentList);
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ detail: 'Server error listing hospital documents.' });
  }
};

// Upload new PDF document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'Please upload a PDF file.' });
    }
    
    res.status(201).json({
      message: `Document ${req.file.originalname} uploaded successfully.`,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ detail: 'Server error during document upload.' });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.resolve(__dirname, '../../documents', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ detail: 'File not found.' });
    }

    // Delete file
    fs.unlinkSync(filePath);
    res.json({ message: `Document ${filename} deleted successfully.` });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ detail: 'Server error deleting document.' });
  }
};

// Trigger reindexing of ChromaDB on the FastAPI python service
exports.rebuildVectorDatabase = async (req, res) => {
  try {
    console.log('Sending request to rebuild ChromaDB database...');
    const pythonApiUrl = 'http://127.0.0.1:8000/api/reindex';
    const response = await fetch(pythonApiUrl, { method: 'POST' });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RAG service reindex failed: ${errorText}`);
    }

    const data = await response.json();
    res.json({ message: 'Vector database reindexed successfully.', status: data });
  } catch (error) {
    console.error('Rebuild database error:', error);
    res.status(500).json({ detail: 'Server error rebuilding vector database. Ensure Python FastAPI server is active.' });
  }
};

// View registered patients/users
exports.getUsersList = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ detail: 'Server error fetching user profiles.' });
  }
};

// View patient feedback reviews
exports.getFeedbackList = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ detail: 'Server error fetching customer feedback.' });
  }
};

// View recent chats (admin view)
exports.getChatsList = async (req, res) => {
  try {
    const chats = await Chat.find()
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json(chats);
  } catch (error) {
    console.error('Get admin chats error:', error);
    res.status(500).json({ detail: 'Server error retrieving recent chat records.' });
  }
};
