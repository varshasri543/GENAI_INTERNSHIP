const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  department: { type: String, required: true },
  hospital: { type: String, default: 'Apollo Hospital' },
  city: { type: String, required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  appointmentId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['scheduled', 'cancelled', 'rescheduled'], default: 'scheduled' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
