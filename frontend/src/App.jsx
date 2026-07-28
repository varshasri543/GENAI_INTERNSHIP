import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Send, 
  RefreshCw, 
  PhoneCall, 
  Building, 
  HelpCircle, 
  BookOpen, 
  ArrowRight, 
  ShieldAlert, 
  Loader, 
  Trash2, 
  FileSearch, 
  ExternalLink, 
  ChevronRight,
  LogOut,
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Mail,
  MapPin,
  Stethoscope
} from 'lucide-react';

const EXPRESS_API_URL = 'http://localhost:5001';
const FASTAPI_API_URL = 'http://localhost:8000';

function App() {
  // Authentication states
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    gender: 'Male',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    pinCode: ''
  });
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Main application navigation
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'book-appointment' | 'my-appointments'

  // Chat chatbot states
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [systemStatus, setSystemStatus] = useState({
    status: 'loading',
    api_key_configured: false,
    database_indexed: false,
    documents_available: false,
    docs_count: 0
  });

  // Appointment scheduling states
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [appointmentForm, setAppointmentForm] = useState({
    city: '',
    department: '',
    doctorName: '',
    hospital: '',
    date: '',
    timeSlot: ''
  });
  
  // Rescheduling states
  const [rescheduleData, setRescheduleData] = useState(null); // appointment object when modifying
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    timeSlot: ''
  });

  const chatEndRef = useRef(null);

  // Doctors static details matching appointmentController.js and generate_pdfs.py
  const doctorsList = [
    { name: 'Dr. Vikram Reddy', department: 'Cardiology', city: 'Hyderabad', hospital: 'Apollo Hospitals, Jubilee Hills', fee: 1000, slots: ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM'] },
    { name: 'Dr. Anjali Sharma', department: 'Cardiology', city: 'Hyderabad', hospital: 'Apollo Hospitals, Secunderabad', fee: 800, slots: ['09:00 AM', '10:30 AM', '01:00 PM', '04:00 PM'] },
    { name: 'Dr. Priya Nair', department: 'Cardiology', city: 'Mumbai', hospital: 'Apollo Hospitals, Navi Mumbai', fee: 1000, slots: ['11:00 AM', '01:30 PM', '03:00 PM'] },
    { name: 'Dr. Karthik Raja', department: 'Cardiology', city: 'Chennai', hospital: 'Apollo Specialty Hospital, Greams Road', fee: 900, slots: ['03:00 PM', '04:30 PM', '05:30 PM'] },
    { name: 'Dr. Ramesh Krishnan', department: 'Neurology', city: 'Chennai', hospital: 'Apollo Specialty Hospital, Greams Road', fee: 1200, slots: ['10:00 AM', '11:00 AM', '12:00 PM', '03:00 PM', '04:00 PM'] },
    { name: 'Dr. Priya Nair', department: 'Neurology', city: 'Chennai', hospital: 'Apollo Specialty Hospital, Greams Road', fee: 1000, slots: ['02:00 PM', '03:00 PM', '05:00 PM'] },
    { name: 'Dr. Sanjay Sen', department: 'Neurology', city: 'Kolkata', hospital: 'Apollo Gleneagles Hospital', fee: 1100, slots: ['09:30 AM', '11:00 AM', '02:30 PM'] },
    { name: 'Dr. Meera Deshmukh', department: 'Neurology', city: 'Mumbai', hospital: 'Apollo Hospitals, Navi Mumbai', fee: 1000, slots: ['02:00 PM', '03:30 PM', '04:30 PM'] },
    { name: 'Dr. Sandeep Hegde', department: 'Orthopedics', city: 'Bangalore', hospital: 'Apollo Hospitals, Bannerghatta Road', fee: 900, slots: ['11:00 AM', '12:30 PM', '02:30 PM', '04:30 PM'] },
    { name: 'Dr. S. K. Prasad', department: 'Orthopedics', city: 'Vizag', hospital: 'Apollo Hospitals, Arilova', fee: 700, slots: ['04:00 PM', '05:00 PM', '06:00 PM'] },
    { name: 'Dr. Amit Patel', department: 'Orthopedics', city: 'Hyderabad', hospital: 'Apollo Hospitals, Jubilee Hills', fee: 950, slots: ['10:30 AM', '12:00 PM', '02:00 PM'] },
    { name: 'Dr. Sunita Rao', department: 'Pediatrics', city: 'Bangalore', hospital: 'Apollo Hospitals, Jayanagar', fee: 800, slots: ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'] },
    { name: 'Dr. Shalini Gupta', department: 'Pediatrics', city: 'Delhi', hospital: 'Apollo Hospitals, Noida', fee: 850, slots: ['03:00 PM', '04:30 PM', '06:00 PM'] },
    { name: 'Dr. Amit Shah', department: 'Oncology', city: 'Chennai', hospital: 'Apollo Cancer Centre, Teynampet', fee: 1500, slots: ['01:00 PM', '02:00 PM', '03:00 PM'] },
    { name: 'Dr. Sameer Bhat', department: 'Oncology', city: 'Delhi', hospital: 'Indraprastha Apollo, Sarita Vihar', fee: 1200, slots: ['09:30 AM', '11:30 AM', '02:00 PM'] },
    { name: 'Dr. Rakesh Prasad', department: 'Gastroenterology', city: 'Hyderabad', hospital: 'Apollo Hospitals, Jubilee Hills', fee: 1100, slots: ['10:00 AM', '11:30 AM', '12:30 PM'] },
    { name: 'Dr. Rajesh Kumar', department: 'General Medicine', city: 'Delhi', hospital: 'Indraprastha Apollo, Sarita Vihar', fee: 800, slots: ['09:00 AM', '11:00 AM', '12:00 PM'] },
    { name: 'Dr. Anita Sharma', department: 'General Medicine', city: 'Bangalore', hospital: 'Apollo Hospitals, Bannerghatta Road', fee: 800, slots: ['02:00 PM', '03:30 PM', '05:00 PM'] }
  ];

  // Helper to generate a clean UUID for session IDs
  const generateUUID = () => {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  };

  // Poll system status and fetch user sessions/appointments if logged in
  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (token) {
      fetchChatSessions();
      fetchAppointments();
    } else {
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setAppointmentsList([]);
    }
  }, [token]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveTab('chat');
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${FASTAPI_API_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (e) {
      setSystemStatus(prev => ({ ...prev, status: 'offline' }));
    }
  };

  const fetchChatSessions = async () => {
    try {
      const res = await fetch(`${EXPRESS_API_URL}/chat/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Set first session as active if none selected
        if (data.length > 0 && !currentSessionId) {
          loadSessionDetails(data[0].sessionId);
        } else if (data.length === 0) {
          startNewChatSession();
        }
      }
    } catch (e) {
      console.error('Error fetching chat sessions:', e);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      chatLoading ? null : setChatLoading(true);
      setCurrentSessionId(sessionId);
      const res = await fetch(`${EXPRESS_API_URL}/chat/session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        // Convert DB format to local UI message format
        const formatted = data.messages.map(m => ({
          _id: m._id,
          role: m.sender,
          content: m.content,
          citations: m.citations || [],
          feedback: m.feedback || { rating: 'none', comment: '' }
        }));
        setMessages(formatted);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Error loading session:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const startNewChatSession = () => {
    const newId = generateUUID();
    setCurrentSessionId(newId);
    setMessages([
      {
        role: 'assistant',
        content: "Hello! Welcome to Apollo Care Desk. I'm your virtual receptionist. How can I assist you today? You can ask me about available doctors, clinic timings, which city our hospitals are located in, emergency trauma care, or insurance guidelines.",
        citations: []
      }
    ]);
  };

  const deleteChatSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation session?")) return;

    try {
      const res = await fetch(`${EXPRESS_API_URL}/chat/session/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const remaining = sessions.filter(s => s.sessionId !== sessionId);
        setSessions(remaining);
        if (currentSessionId === sessionId) {
          if (remaining.length > 0) {
            loadSessionDetails(remaining[0].sessionId);
          } else {
            startNewChatSession();
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleSendMessage = async (e, textToSend = null) => {
    if (e) e.preventDefault();
    const activeQuery = textToSend || query;
    if (!activeQuery.trim() || chatLoading) return;

    // Local state updates
    const userMessage = { role: 'user', content: activeQuery };
    const oldMessages = [...messages];
    
    // If it's a completely new session (empty or only welcome message), save it first
    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setQuery('');
    setChatLoading(true);

    try {
      const res = await fetch(`${EXPRESS_API_URL}/chat/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: activeQuery,
          sessionId: currentSessionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update history in user list if it's the first message
        const exists = sessions.some(s => s.sessionId === currentSessionId);
        if (!exists) {
          fetchChatSessions();
        }

        // Replace user message and add assistant message with real DB IDs
        setMessages(prev => {
          // Remove the temporary user message
          const base = prev.slice(0, prev.length - 1);
          return [
            ...base,
            { _id: data.userMessageId, role: 'user', content: activeQuery },
            { 
              _id: data.assistantMessageId, 
              role: 'assistant', 
              content: data.answer, 
              citations: data.citations || [],
              feedback: { rating: 'none', comment: '' }
            }
          ];
        });
      } else {
        const errData = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${errData.detail || 'Could not communicate with the Express gateway.'}`,
          citations: []
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I couldn't reach the Apollo backend server. Please verify that the services are online.",
        citations: []
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    if (!messageId) return;

    // Optimistically update UI
    setMessages(prev => prev.map(m => {
      if (m._id === messageId) {
        return { ...m, feedback: { ...m.feedback, rating } };
      }
      return m;
    }));

    try {
      await fetch(`${EXPRESS_API_URL}/chat/feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          messageId,
          rating,
          comment: ''
        })
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleReindex = async () => {
    try {
      setSystemStatus(prev => ({ ...prev, status: 'indexing' }));
      const res = await fetch(`${FASTAPI_API_URL}/api/reindex`, { method: 'POST' });
      if (res.ok) {
        fetchSystemStatus();
        alert('Apollo hospital documents reindexed successfully!');
      } else {
        alert('Failed to reindex documents.');
      }
    } catch (e) {
      alert('Error connecting to RAG backend for reindexing.');
    }
  };

  // Auth Operations
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch(`${EXPRESS_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        setAuthError(data.detail || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setAuthError('Unable to connect to the backend server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch(`${EXPRESS_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });

      const data = await res.json();
      if (res.ok) {
        // Automatically switch to login tab and populate details
        setLoginForm({ email: registerForm.email, password: registerForm.password });
        setAuthMode('login');
        alert('Registration successful! Please log in to your account.');
      } else {
        setAuthError(data.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setAuthError('Unable to connect to the backend server.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Appointment Operations
  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${EXPRESS_API_URL}/appointments/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAppointmentsList(data);
      }
    } catch (e) {
      console.error('Error fetching appointments:', e);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingMessage(null);

    // Validate selections
    if (!appointmentForm.city || !appointmentForm.department || !appointmentForm.doctorName || !appointmentForm.date || !appointmentForm.timeSlot) {
      setBookingMessage({ type: 'error', text: 'Please fill in all booking fields.' });
      setBookingLoading(false);
      return;
    }

    try {
      const res = await fetch(`${EXPRESS_API_URL}/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentForm)
      });

      const data = await res.json();
      if (res.ok) {
        setBookingMessage({ type: 'success', text: `Appointment booked successfully! ID: ${data.appointmentId}` });
        // Reset form
        setAppointmentForm({
          city: '',
          department: '',
          doctorName: '',
          hospital: '',
          date: '',
          timeSlot: ''
        });
        fetchAppointments();
      } else {
        setBookingMessage({ type: 'error', text: data.detail || 'Booking failed.' });
      }
    } catch (err) {
      setBookingMessage({ type: 'error', text: 'Error connecting to the scheduling system.' });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`${EXPRESS_API_URL}/appointments/cancel/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Appointment cancelled successfully.');
        fetchAppointments();
      } else {
        alert('Failed to cancel appointment.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReschedule = (appt) => {
    setRescheduleData(appt);
    setRescheduleForm({
      date: new Date(appt.date).toISOString().split('T')[0],
      timeSlot: appt.timeSlot
    });
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleForm.date || !rescheduleForm.timeSlot) return;

    try {
      const res = await fetch(`${EXPRESS_API_URL}/appointments/reschedule/${rescheduleData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rescheduleForm)
      });

      if (res.ok) {
        alert('Appointment rescheduled successfully.');
        setRescheduleData(null);
        fetchAppointments();
      } else {
        alert('Failed to reschedule appointment.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCitationClick = (source, page) => {
    setSelectedDoc(source);
    setSelectedPage(page);
  };

  // Filter lists dynamically based on selections
  const uniqueCities = Array.from(new Set(doctorsList.map(d => d.city)));
  const filteredDepartments = appointmentForm.city 
    ? Array.from(new Set(doctorsList.filter(d => d.city === appointmentForm.city).map(d => d.department)))
    : Array.from(new Set(doctorsList.map(d => d.department)));

  const filteredDoctors = appointmentForm.city && appointmentForm.department
    ? doctorsList.filter(d => d.city === appointmentForm.city && d.department === appointmentForm.department)
    : [];

  const selectedDoctorObj = appointmentForm.doctorName 
    ? doctorsList.find(d => d.name === appointmentForm.doctorName && d.city === appointmentForm.city)
    : null;

  const suggestedQuestions = [
    "Where are Apollo Hospitals located in Hyderabad?",
    "Is Dr. Vikram Reddy available in Hyderabad?",
    "What are the consulting hours of Dr. Ramesh Krishnan in Greams Road?",
    "What is the contact number of Apollo Hospital?",
    "Does the hospital provide cashless insurance?",
    "What checkup packages are offered at Apollo?",
    "How do I book an appointment online?"
  ];

  const hospitalDocs = [
    { name: "Patient_Guide.pdf", label: "Patient Admission Guide" },
    { name: "Doctors_Directory.pdf", label: "Doctors Consulting Directory" },
    { name: "Departments.pdf", label: "Speciality Clinics Profile" },
    { name: "Insurance_Policies.pdf", label: "TPA & Cashless Policies" },
    { name: "Appointment_Guide.pdf", label: "Appointment Scheduling Guide" },
    { name: "Visitor_Guidelines.pdf", label: "Visitor Rules & Guidelines" },
    { name: "Emergency_Services.pdf", label: "Emergency & Trauma Services" },
    { name: "Hospital_FAQ.pdf", label: "Comprehensive Hospital FAQ" }
  ];

  // Auth Portal View
  if (!token) {
    return (
      <div className="auth-portal">
        <div className="auth-card">
          <div className="auth-header">
            <div className="reception-avatar text-white">
              <Building size={24} />
            </div>
            <h2>Apollo Hospitals</h2>
            <p>Clinical Care & Digital Portals</p>
          </div>

          <div className="auth-toggle">
            <button 
              className={authMode === 'login' ? 'active' : ''} 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              Log In
            </button>
            <button 
              className={authMode === 'register' ? 'active' : ''} 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="auth-error-card">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label><Mail size={14} /> Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="Enter your registered email" 
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label><Lock size={14} /> Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Enter your secret password" 
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                {authLoading ? <Loader className="animate-spin" size={16} /> : 'Access Care Desk'}
              </button>
            </form>
          ) : (
            <form className="auth-form register-grid-form" onSubmit={handleRegister}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input 
                    type="text" required placeholder="John"
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input 
                    type="text" required placeholder="Doe"
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" required placeholder="john.doe@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" required placeholder="9876543210"
                    value={registerForm.phoneNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input 
                    type="password" required placeholder="Min 6 chars"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select 
                    value={registerForm.gender}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input 
                    type="date" required
                    value={registerForm.dateOfBirth}
                    onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input 
                    type="text" required placeholder="Hyderabad"
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>State</label>
                  <input 
                    type="text" required placeholder="Telangana"
                    value={registerForm.state}
                    onChange={(e) => setRegisterForm({ ...registerForm, state: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Pin Code</label>
                  <input 
                    type="text" required placeholder="500081"
                    value={registerForm.pinCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, pinCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width-group">
                <label>Address</label>
                <input 
                  type="text" required placeholder="Flat No, Road Name, Area"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                {authLoading ? <Loader className="animate-spin" size={16} /> : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Authenticated View
  return (
    <div className="dashboard-root">
      {/* Top Navbar */}
      <header className="dashboard-navbar">
        <div className="nav-logo">
          <div className="logo-icon"><Building size={18} /></div>
          <div>
            <h1>Apollo Hospitals</h1>
            <p>Clinical Network & Assistant Portal</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            AI Reception Desk
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'book-appointment' ? 'active' : ''}`}
            onClick={() => setActiveTab('book-appointment')}
          >
            Schedule Consultation
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'my-appointments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('my-appointments'); fetchAppointments(); }}
          >
            My Appointments ({appointmentsList.length})
          </button>
        </nav>

        <div className="nav-profile">
          <div className="profile-details">
            <span className="profile-name">{user?.firstName} {user?.lastName}</span>
            <span className="profile-role">Registered Patient</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Work Area */}
      <div className="dashboard-body">
        
        {/* Tab 1: AI Chat Assistant */}
        {activeTab === 'chat' && (
          <div className="app-container">
            {/* 1. Left Sidebar: Info Desk & Chat History */}
            <aside className="info-desk">
              
              {/* Chat Sessions list */}
              <div className="info-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3>Conversations</h3>
                  <button className="new-session-btn" onClick={startNewChatSession} title="New Conversation">
                    <Plus size={14} /> New
                  </button>
                </div>
                <div className="chat-sessions-list">
                  {sessions.map((s, idx) => (
                    <div 
                      key={s.sessionId} 
                      className={`chat-session-item ${currentSessionId === s.sessionId ? 'active' : ''}`}
                      onClick={() => loadSessionDetails(s.sessionId)}
                    >
                      <span className="session-title" title={s.title}>{s.title}</span>
                      <button 
                        className="session-delete-btn" 
                        onClick={(e) => deleteChatSession(s.sessionId, e)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="no-sessions-placeholder">No saved conversations</div>
                  )}
                </div>
              </div>

              {/* Suggested Queries */}
              <div className="info-section">
                <h3><HelpCircle size={14} /> Suggested Questions</h3>
                <div className="suggested-qs">
                  {suggestedQuestions.map((q, idx) => (
                    <button 
                      key={idx} 
                      className="suggested-q-btn"
                      onClick={() => handleSendMessage(null, q)}
                      disabled={chatLoading}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Quick access */}
              <div className="info-section">
                <h3><BookOpen size={14} /> Knowledge Library</h3>
                <div className="suggested-qs">
                  {hospitalDocs.map((doc, idx) => (
                    <button 
                      key={idx} 
                      className="suggested-q-btn"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => {
                        setSelectedDoc(doc.name);
                        setSelectedPage(1);
                      }}
                    >
                      <span>{doc.label}</span>
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency Info */}
              <div className="info-section" style={{ marginTop: 'auto' }}>
                <div className="contact-card">
                  <h4><PhoneCall size={14} /> Emergency Helpline</h4>
                  <p>+91 99999 88888</p>
                  <span>Available 24/7. Call for trauma, cardiac arrests & ambulance dispatch.</span>
                </div>
              </div>
            </aside>

            {/* 2. Center: Chat Box */}
            <main className="chat-window">
              {/* System warning ribbon if API Key is not configured */}
              {!systemStatus.api_key_configured && systemStatus.status !== 'loading' && (
                <div className="status-ribbon">
                  <ShieldAlert size={14} />
                  <span>Google Gemini API Key is not set in backend/.env. Please configure it to enable RAG answers.</span>
                </div>
              )}

              {/* System notification if database needs indexing */}
              {systemStatus.api_key_configured && !systemStatus.database_indexed && systemStatus.status !== 'loading' && (
                <div className="status-ribbon">
                  <ShieldAlert size={14} />
                  <span>Apollo document database is not indexed. Click to run generator and indexer.</span>
                  <button className="reindex-btn" onClick={handleReindex}>
                    Generate & Index
                  </button>
                </div>
              )}

              {/* Chat Area Header */}
              <header className="chat-header">
                <div className="reception-info">
                  <div className="reception-avatar">
                    <FileSearch size={20} />
                  </div>
                  <div className="reception-status">
                    <h2>Apollo Care Desk Reception</h2>
                    <div className="status-indicator">
                      <span className="status-dot"></span>
                      <span>Active | Hospital AI Agent</span>
                    </div>
                  </div>
                </div>

                <div className="chat-actions">
                  {systemStatus.api_key_configured && (
                    <button 
                      className="action-btn" 
                      onClick={handleReindex} 
                      title="Force Re-index Document Library"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </header>

              {/* Chat dialogue list */}
              <div className="chat-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-message-row ${msg.role}`}>
                    <div className="message-bubble">
                      <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>

                      {/* Display citations if assistant response has citations */}
                      {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                        <div className="message-citations">
                          <span className="citation-title">CITED SOURCES:</span>
                          {msg.citations.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              className="citation-pill"
                              onClick={() => handleCitationClick(cite.source, cite.page)}
                            >
                              <FileText size={10} />
                              <span>{cite.source.replace('.pdf', '')} (P. {cite.page})</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Message Feedback actions */}
                      {msg.role === 'assistant' && msg._id && (
                        <div className="message-feedback-row">
                          <button 
                            className={`feedback-icon-btn ${msg.feedback?.rating === 'up' ? 'active' : ''}`}
                            onClick={() => handleFeedback(msg._id, 'up')}
                            title="Helpful Answer"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button 
                            className={`feedback-icon-btn ${msg.feedback?.rating === 'down' ? 'active' : ''}`}
                            onClick={() => handleFeedback(msg._id, 'down')}
                            title="Unhelpful Answer"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="chat-message-row assistant">
                    <div className="message-bubble" style={{ background: '#f7f8f9' }}>
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Bar Form */}
              <footer className="chat-input-area">
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="chat-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question about Apollo doctors, cities, timings, insurance policies..."
                    disabled={chatLoading}
                  />
                  <button type="submit" className="send-btn" disabled={chatLoading || !query.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </footer>
            </main>

            {/* 3. Right Panel: Document Viewer */}
            <section className="doc-viewer">
              <header className="doc-header">
                <h2>
                  <FileText size={16} /> 
                  <span>{selectedDoc ? selectedDoc : 'Hospital Documentation'}</span>
                </h2>
                {selectedDoc && (
                  <button className="close-doc-btn" onClick={() => setSelectedDoc(null)}>
                    Close View
                  </button>
                )}
              </header>

              <div className="doc-body">
                {selectedDoc ? (
                  <iframe 
                    src={`${FASTAPI_API_URL}/documents/${selectedDoc}#page=${selectedPage}`} 
                    className="iframe-container"
                    title="PDF Document View"
                  />
                ) : (
                  <div className="doc-placeholder">
                    <FileSearch className="doc-placeholder-icon" />
                    <h3>Apollo Reference Library</h3>
                    <p>
                      When you ask the Apollo Care Desk receptionist a question, the reference source documents will appear here dynamically.
                    </p>
                    
                    <div style={{ width: '100%', marginTop: 25 }}>
                      <h4 style={{ fontSize: 12, color: 'var(--primary-color)', textAlign: 'left', marginBottom: 12 }}>
                        Major Apollo Specialties
                      </h4>
                      <div className="departments-grid">
                        <div className="dept-tag">General Medicine</div>
                        <div className="dept-tag">Cardiology</div>
                        <div className="dept-tag">Neurology</div>
                        <div className="dept-tag">Orthopedics</div>
                        <div className="dept-tag">Pediatrics</div>
                        <div className="dept-tag">Oncology</div>
                        <div className="dept-tag">Gastroenterology</div>
                        <div className="dept-tag">Trauma & Emergency</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Book Appointment */}
        {activeTab === 'book-appointment' && (
          <div className="appointment-booking-tab">
            <div className="booking-card">
              <div className="booking-card-header">
                <Calendar size={22} />
                <h2>Schedule a Doctor Consultation</h2>
                <p>Book real-time OPD and clinical consultation appointments at any Apollo branch.</p>
              </div>

              {bookingMessage && (
                <div className={`alert-banner ${bookingMessage.type}`}>
                  {bookingMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{bookingMessage.text}</span>
                </div>
              )}

              <form className="booking-form" onSubmit={handleBookAppointment}>
                <div className="form-grid">
                  <div className="form-group">
                    <label><MapPin size={14} /> 1. Select City</label>
                    <select 
                      value={appointmentForm.city}
                      required
                      onChange={(e) => setAppointmentForm({ 
                        ...appointmentForm, 
                        city: e.target.value, 
                        department: '', 
                        doctorName: '', 
                        hospital: '',
                        timeSlot: '' 
                      })}
                    >
                      <option value="">-- Choose City --</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label><Stethoscope size={14} /> 2. Speciality Department</label>
                    <select 
                      value={appointmentForm.department}
                      required
                      disabled={!appointmentForm.city}
                      onChange={(e) => setAppointmentForm({ 
                        ...appointmentForm, 
                        department: e.target.value, 
                        doctorName: '', 
                        hospital: '',
                        timeSlot: ''
                      })}
                    >
                      <option value="">-- Choose Speciality --</option>
                      {filteredDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label><User size={14} /> 3. Medical Consultant</label>
                    <select 
                      value={appointmentForm.doctorName}
                      required
                      disabled={!appointmentForm.department}
                      onChange={(e) => {
                        const docObj = doctorsList.find(d => d.name === e.target.value && d.city === appointmentForm.city);
                        setAppointmentForm({ 
                          ...appointmentForm, 
                          doctorName: e.target.value, 
                          hospital: docObj ? docObj.hospital : '',
                          timeSlot: ''
                        });
                      }}
                    >
                      <option value="">-- Choose Doctor --</option>
                      {filteredDoctors.map(d => (
                        <option key={d.name} value={d.name}>{d.name} ({d.hospital.split(', ')[1] || d.hospital})</option>
                      ))}
                    </select>
                  </div>

                  {selectedDoctorObj && (
                    <div className="doctor-info-box">
                      <h4>Consultant Profile:</h4>
                      <p><b>Name:</b> {selectedDoctorObj.name}</p>
                      <p><b>Hospital:</b> {selectedDoctorObj.hospital}</p>
                      <p><b>Department:</b> {selectedDoctorObj.department}</p>
                      <p><b>Consultation Fee:</b> INR {selectedDoctorObj.fee}</p>
                      <p><b>Available Days:</b> Mon - Sat (Consult FAQ for details)</p>
                    </div>
                  )}

                  <div className="form-group">
                    <label><Calendar size={14} /> 4. Appointment Date</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label><Clock size={14} /> 5. Consultation Time Slot</label>
                    <select 
                      value={appointmentForm.timeSlot}
                      required
                      disabled={!appointmentForm.doctorName}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, timeSlot: e.target.value })}
                    >
                      <option value="">-- Choose Time Slot --</option>
                      {selectedDoctorObj?.slots.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" className="book-btn" disabled={bookingLoading}>
                  {bookingLoading ? <Loader className="animate-spin" size={16} /> : 'Book Appointment Ticket'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Appointments List / History */}
        {activeTab === 'my-appointments' && (
          <div className="my-appointments-tab">
            <div className="appointments-history-container">
              <div className="history-header">
                <Clock size={20} />
                <h2>Consultation Booking History</h2>
                <p>Manage, reschedule, or cancel your appointments with Apollo medical staff.</p>
              </div>

              <div className="appointments-list-grid">
                {appointmentsList.map((appt) => (
                  <div key={appt._id} className={`appointment-ticket-card ${appt.status}`}>
                    <div className="ticket-header">
                      <span className="appt-id">{appt.appointmentId}</span>
                      <span className={`status-badge ${appt.status}`}>{appt.status.toUpperCase()}</span>
                    </div>

                    <div className="ticket-details">
                      <h3>{appt.doctorName}</h3>
                      <p className="dept-tag-small">{appt.department}</p>
                      
                      <div className="detail-row">
                        <Building size={13} />
                        <span>{appt.hospital} ({appt.city})</span>
                      </div>

                      <div className="detail-row">
                        <Calendar size={13} />
                        <span>{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>

                      <div className="detail-row">
                        <Clock size={13} />
                        <span>{appt.timeSlot}</span>
                      </div>
                    </div>

                    {appt.status !== 'cancelled' && (
                      <div className="ticket-actions">
                        <button 
                          className="ticket-reschedule-btn"
                          onClick={() => handleOpenReschedule(appt)}
                        >
                          Reschedule
                        </button>
                        <button 
                          className="ticket-cancel-btn"
                          onClick={() => handleCancelAppointment(appt._id)}
                        >
                          Cancel Booking
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {appointmentsList.length === 0 && (
                  <div className="no-bookings-placeholder">
                    <Calendar size={48} />
                    <h3>No Bookings Found</h3>
                    <p>You haven't scheduled any appointments yet. Click 'Schedule Consultation' to book one.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reschedule Modal Overlay */}
            {rescheduleData && (
              <div className="reschedule-modal-overlay">
                <div className="reschedule-modal">
                  <h3>Reschedule Appointment</h3>
                  <p>Modify date or slot for <b>{rescheduleData.appointmentId}</b> with <b>{rescheduleData.doctorName}</b>.</p>
                  
                  <form onSubmit={handleRescheduleSubmit}>
                    <div className="form-group">
                      <label>New Consultation Date</label>
                      <input 
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={rescheduleForm.date}
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>New Time Slot</label>
                      <select 
                        value={rescheduleForm.timeSlot}
                        required
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, timeSlot: e.target.value })}
                      >
                        <option value="">-- Select Time Slot --</option>
                        {doctorsList.find(d => d.name === rescheduleData.doctorName)?.slots.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="modal-buttons">
                      <button type="submit" className="confirm-reschedule-btn">Confirm Changes</button>
                      <button 
                        type="button" 
                        className="cancel-modal-btn"
                        onClick={() => setRescheduleData(null)}
                      >
                        Discard
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
