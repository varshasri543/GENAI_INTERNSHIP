const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/message', protect, chatController.sendMessage);
router.get('/sessions', protect, chatController.getSessionsList);
router.get('/session/:sessionId', protect, chatController.getSessionDetails);
router.delete('/session/:sessionId', protect, chatController.deleteSession);
router.post('/feedback', protect, chatController.submitFeedback);

module.exports = router;
