const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT tokens
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'apollo_jwt_secret_key_2026', { expiresIn: '1d' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'apollo_jwt_refresh_secret_key_2026', { expiresIn: '7d' });
};

// In-memory store for OTP simulation
const otpStore = new Map();

// Register a new user
exports.register = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phoneNumber, password,
      gender, dateOfBirth, address, city, state, pinCode, role
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ detail: 'Email is already registered.' });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      gender,
      dateOfBirth,
      address,
      city,
      state,
      pinCode,
      role: role || 'user' // Allow specifying role (useful for creating first admin)
    });

    if (user) {
      res.status(201).json({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
    } else {
      res.status(400).json({ detail: 'Invalid user data.' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ detail: 'Server error during registration.' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in database if rememberMe is true or standard
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        state: user.state,
        pinCode: user.pinCode
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Server error during login.' });
  }
};

// Refresh Access Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ detail: 'Refresh Token required.' });
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(403).json({ detail: 'Invalid Refresh Token.' });
    }

    // Verify token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'apollo_jwt_refresh_secret_key_2026', (err, decoded) => {
      if (err || decoded.id !== user._id.toString()) {
        return res.status(403).json({ detail: 'Invalid or expired Refresh Token.' });
      }

      const accessToken = generateAccessToken(user._id);
      res.json({ token: accessToken });
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ detail: 'Server error during token refresh.' });
  }
};

// Logout User
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ detail: 'Server error during logout.' });
  }
};

// Get profile details
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ detail: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ detail: 'Server error fetching profile.' });
  }
};

// Send OTP simulation
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ detail: 'No user registered with this email.' });
    }

    // Generate a 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in-memory for 5 minutes
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
    
    console.log(`[Apollo Server] Reset password OTP code for ${email} is: ${otp}`);

    // In a real application, we would email the OTP.
    // For demo/ease of testing, we return the OTP in the API response as well.
    res.json({ 
      message: 'OTP sent to your email (simulated). Check server logs or use the code returned below.',
      otp: otp // Return directly so user doesn't need external email client during validation
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ detail: 'Server error initiating password reset.' });
  }
};

// Reset password with OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ detail: 'No OTP requested or session expired.' });
    }

    if (storedData.expires < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({ detail: 'OTP code has expired.' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ detail: 'Invalid OTP code.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ detail: 'User not found.' });
    }

    // Update password
    user.password = newPassword;
    user.refreshToken = null; // Invalidate current logins
    await user.save();

    // Clean up OTP store
    otpStore.delete(email);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ detail: 'Server error resetting password.' });
  }
};
