const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage for uploading hospital PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const docsDir = path.resolve(__dirname, '../../documents');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    cb(null, docsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return cb(new Error('Only PDF documents are allowed.'));
    }
    cb(null, true);
  }
});

// Protect all routes with JWT token + Admin check
router.use(protect);
router.use(adminOnly);

router.get('/analytics', adminController.getAnalytics);
router.get('/documents', adminController.listDocuments);
router.post('/upload-document', upload.single('document'), adminController.uploadDocument);
router.delete('/delete-document/:filename', adminController.deleteDocument);
router.post('/rebuild-db', adminController.rebuildVectorDatabase);
router.get('/users', adminController.getUsersList);
router.get('/feedbacks', adminController.getFeedbackList);
router.get('/chats', adminController.getChatsList);

module.exports = router;
