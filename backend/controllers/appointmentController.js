const Appointment = require('../models/Appointment');

// Mock Doctors Dataset matching realistic directories to avoid hallucinations
const DOCTORS_DATA = [
  { id: 'doc1', name: 'Dr. Vikram Reddy', department: 'Cardiology', city: 'Hyderabad', hospital: 'Apollo Hospitals, Jubilee Hills', fee: 1000, slots: ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM'] },
  { id: 'doc2', name: 'Dr. Anjali Sharma', department: 'Cardiology', city: 'Hyderabad', hospital: 'Apollo Hospitals, Secunderabad', fee: 800, slots: ['09:00 AM', '10:30 AM', '01:00 PM', '04:00 PM'] },
  { id: 'doc3', name: 'Dr. Ramesh Krishnan', department: 'Neurology', city: 'Chennai', hospital: 'Apollo Specialty Hospital, Greams Road', fee: 1200, slots: ['10:00 AM', '11:00 AM', '12:00 PM', '03:00 PM', '04:00 PM'] },
  { id: 'doc4', name: 'Dr. Priya Nair', department: 'Neurology', city: 'Chennai', hospital: 'Apollo Specialty Hospital, Greams Road', fee: 1000, slots: ['02:00 PM', '03:00 PM', '05:00 PM'] },
  { id: 'doc5', name: 'Dr. Sandeep Hegde', department: 'Orthopedics', city: 'Bangalore', hospital: 'Apollo Hospitals, Bannerghatta Road', fee: 900, slots: ['11:00 AM', '12:30 PM', '02:30 PM', '04:30 PM'] },
  { id: 'doc6', name: 'Dr. S. K. Prasad', department: 'Orthopedics', city: 'Vizag', hospital: 'Apollo Hospitals, Arilova', fee: 700, slots: ['04:00 PM', '05:00 PM', '06:00 PM'] },
  { id: 'doc7', name: 'Dr. Sunita Rao', department: 'Pediatrics', city: 'Bangalore', hospital: 'Apollo Hospitals, Jayanagar', fee: 800, slots: ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'] },
  { id: 'doc8', name: 'Dr. Amit Shah', department: 'Oncology', city: 'Chennai', hospital: 'Apollo Cancer Centre, Teynampet', fee: 1500, slots: ['01:00 PM', '02:00 PM', '03:00 PM'] }
];

// Get doctors list with filter support
exports.getDoctors = async (req, res) => {
  try {
    const { city, department, name } = req.query;
    let filtered = [...DOCTORS_DATA];

    if (city) {
      filtered = filtered.filter(d => d.city.toLowerCase() === city.toLowerCase());
    }
    if (department) {
      filtered = filtered.filter(d => d.department.toLowerCase() === department.toLowerCase());
    }
    if (name) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(name.toLowerCase()));
    }

    res.json(filtered);
  } catch (error) {
    console.error('Fetch doctors error:', error);
    res.status(500).json({ detail: 'Server error fetching doctors list.' });
  }
};

// Book an appointment
exports.bookAppointment = async (req, res) => {
  try {
    const { doctorName, department, hospital, city, date, timeSlot } = req.body;

    if (!doctorName || !department || !city || !date || !timeSlot) {
      return res.status(400).json({ detail: 'Please provide all booking details.' });
    }

    // Generate unique Appointment ID APPT-XXXXXX
    const appointmentId = 'APPT-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const appointment = await Appointment.create({
      userId: req.user.id,
      doctorName,
      department,
      hospital: hospital || 'Apollo Hospital',
      city,
      date,
      timeSlot,
      appointmentId
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ detail: 'Server error booking appointment.' });
  }
};

// Get upcoming and past appointments for logged in user
exports.getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.id })
      .sort({ date: -1, timeSlot: -1 });
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ detail: 'Server error retrieving appointments.' });
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findOne({ _id: id, userId: req.user.id });

    if (!appointment) {
      return res.status(404).json({ detail: 'Appointment not found.' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully.', appointment });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ detail: 'Server error cancelling appointment.' });
  }
};

// Reschedule appointment
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({ detail: 'Please specify the new date and time slot.' });
    }

    const appointment = await Appointment.findOne({ _id: id, userId: req.user.id });
    if (!appointment) {
      return res.status(404).json({ detail: 'Appointment not found.' });
    }

    appointment.date = date;
    appointment.timeSlot = timeSlot;
    appointment.status = 'rescheduled';
    await appointment.save();

    res.json({ message: 'Appointment rescheduled successfully.', appointment });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ detail: 'Server error rescheduling appointment.' });
  }
};
