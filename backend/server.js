const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// Security and CORS
app.use(helmet({
  crossOriginResourcePolicy: false // Allow static files like PDFs to load properly in iframe
}));
app.use(cors({
  origin: '*', // In production, restrict to frontend origin
  credentials: true
}));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apollo-hospital';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Register routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/appointments', require('./routes/appointmentRoutes'));
app.use('/chat', require('./routes/chatRoutes'));
app.use('/admin', require('./routes/adminRoutes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ detail: err.message || 'Internal Server Error' });
});

// Spawn the Python FastAPI subprocess for LangChain RAG on port 8000
let fastapiProcess = null;
function startFastAPIServer() {
  const rootDir = path.join(__dirname, '..');
  const pythonExec = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
  
  if (!fs.existsSync(pythonExec)) {
    console.error(`Python virtual environment not found at: ${pythonExec}. Please check path.`);
    return;
  }

  console.log(`Starting Python RAG backend using: ${pythonExec}`);
  const venvSitePackages = path.join(rootDir, 'venv', 'Lib', 'site-packages');
  fastapiProcess = spawn(pythonExec, [
    '-m', 'uvicorn', 'backend.app:app',
    '--host', '127.0.0.1',
    '--port', '8000'
  ], {
    cwd: rootDir,
    env: {
      ...process.env,
      PYTHONPATH: rootDir,
      PYTHONNOUSERSITE: '1',
      PATH: path.join(rootDir, 'venv', 'Scripts') + ';' + process.env.PATH
    }
  });

  fastapiProcess.stdout.on('data', (data) => {
    console.log(`[FastAPI] ${data.toString().trim()}`);
  });

  fastapiProcess.stderr.on('data', (data) => {
    console.error(`[FastAPI Error] ${data.toString().trim()}`);
  });

  fastapiProcess.on('close', (code) => {
    console.log(`FastAPI server closed with code: ${code}`);
  });
}

startFastAPIServer();

// Graceful cleanup on exit
function cleanup() {
  if (fastapiProcess) {
    console.log('Stopping Python FastAPI server...');
    fastapiProcess.kill();
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  if (fastapiProcess) fastapiProcess.kill();
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
