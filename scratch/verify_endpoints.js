const EXPRESS_URL = 'http://localhost:5001';
const CHAT_SESSION_ID = 'test_session_' + Math.random().toString(36).substring(7);

async function testFlow() {
  console.log('=== STARTING APOLLO APP API INTEGRATION TEST ===');
  
  // 1. Register a new user
  const email = `test.user.${Date.now()}@apollo.com`;
  console.log(`\n[1/6] Registering user: ${email}...`);
  let registerRes;
  try {
    registerRes = await fetch(`${EXPRESS_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Patient',
        email: email,
        phoneNumber: '1234567890',
        password: 'password123',
        gender: 'Male',
        dateOfBirth: '1995-10-10',
        address: '100 Apollo Way',
        city: 'Hyderabad',
        state: 'Telangana',
        pinCode: '500081'
      })
    });
  } catch (err) {
    console.error('Registration failed to connect:', err.message);
    return;
  }
  
  const registerData = await registerRes.json();
  if (registerRes.ok) {
    console.log('User registered successfully:', registerData);
  } else {
    console.error('Registration failed:', registerData);
    return;
  }

  // 2. Log in
  console.log(`\n[2/6] Logging in as ${email}...`);
  const loginRes = await fetch(`${EXPRESS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  if (loginRes.ok) {
    console.log('Login successful! Token acquired.');
  } else {
    console.error('Login failed:', loginData);
    return;
  }
  
  const token = loginData.token;

  // 3. Send message to chatbot (RAG)
  console.log('\n[3/6] Sending message: "Who is Dr. Vikram Reddy and where does he consult?"...');
  const chatRes = await fetch(`${EXPRESS_URL}/chat/message`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: 'Who is Dr. Vikram Reddy and where does he consult?',
      sessionId: CHAT_SESSION_ID
    })
  });
  const chatData = await chatRes.json();
  if (chatRes.ok) {
    console.log('\nChatbot Answer:');
    console.log(chatData.answer);
    console.log('\nCitations provided:', chatData.citations);
  } else {
    console.error('Chat request failed:', chatData);
  }

  // 4. Retrieve saved sessions list
  console.log('\n[4/6] Retrieving user conversation sessions list...');
  const sessionsRes = await fetch(`${EXPRESS_URL}/chat/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const sessionsData = await sessionsRes.json();
  if (sessionsRes.ok) {
    console.log('User conversation sessions found:', sessionsData);
  } else {
    console.error('Failed to get sessions:', sessionsData);
  }

  // 5. Book an appointment
  console.log('\n[5/6] Booking appointment with Dr. Vikram Reddy...');
  const bookRes = await fetch(`${EXPRESS_URL}/appointments/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      city: 'Hyderabad',
      department: 'Cardiology',
      doctorName: 'Dr. Vikram Reddy',
      hospital: 'Apollo Hospitals, Jubilee Hills',
      date: '2026-07-15',
      timeSlot: '10:00 AM'
    })
  });
  const bookData = await bookRes.json();
  if (bookRes.ok) {
    console.log('Appointment booked successfully! Ticket details:', bookData);
  } else {
    console.error('Booking failed:', bookData);
  }

  // 6. View appointment history
  console.log('\n[6/6] Retrieving user appointment ticket history...');
  const apptsRes = await fetch(`${EXPRESS_URL}/appointments/history`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const apptsData = await apptsRes.json();
  if (apptsRes.ok) {
    console.log('Booked appointments count:', apptsData.length);
    console.log('Latest ticket status:', apptsData[0]?.status);
  } else {
    console.error('Failed to get appointments:', apptsData);
  }

  console.log('\n=== INTEGRATION TEST COMPLETED ===');
}

testFlow();
