const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/doctors', protect, appointmentController.getDoctors);
router.post('/book', protect, appointmentController.bookAppointment);
router.get('/history', protect, appointmentController.getUserAppointments);
router.put('/reschedule/:id', protect, appointmentController.rescheduleAppointment);
router.put('/cancel/:id', protect, appointmentController.cancelAppointment);

module.exports = router;
