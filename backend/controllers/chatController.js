const Chat = require('../models/Chat');
const Feedback = require('../models/Feedback');

// Helper: sleep for a given number of milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Proxy query to Python FastAPI AI service with retry/backoff for startup race condition
const queryAIService = async (query, history) => {
  const pythonApiUrl = 'http://127.0.0.1:8000/api/chat';
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 2000; // start with 2 second wait

  // Format history to match FastAPI expected payload: [{role: 'user'|'assistant', content: '...'}]
  const formattedHistory = history.map(msg => ({
    role: msg.sender,
    content: msg.content
  }));

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(pythonApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history: formattedHistory })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI RAG Service error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      const isConnectionRefused =
        error?.cause?.code === 'ECONNREFUSED' ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('fetch failed');

      if (isConnectionRefused && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt; // 2s, 4s, 6s, 8s ...
        console.warn(
          `[ChatController] Python AI Service not ready (attempt ${attempt}/${MAX_RETRIES}). ` +
          `Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
        continue;
      }

      // Non-connection error or exhausted retries — log and fall through
      console.error('Error contacting Python AI Service:', error);
      break;
    }
  }

  // Graceful fallback response if API is still offline after all retries
  return {
    answer: "I'm sorry, the AI service is still starting up or is unavailable. Please wait a moment and try again.",
    citations: []
  };
};

// Send message & get AI response
exports.sendMessage = async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    const userId = req.user.id;

    if (!query || !sessionId) {
      return res.status(400).json({ detail: 'Missing query or sessionId.' });
    }

    // 1. Fetch existing chat or create a new session
    let chat = await Chat.findOne({ sessionId, userId });
    if (!chat) {
      chat = new Chat({
        userId,
        sessionId,
        title: query.length > 30 ? query.substring(0, 30) + '...' : query,
        messages: []
      });
    }

    // 2. Format history from MongoDB messages
    const history = chat.messages.map(m => ({
      sender: m.sender,
      content: m.content
    }));

    // 3. Save User message to database
    chat.messages.push({
      sender: 'user',
      content: query
    });
    await chat.save();

    // 4. Query Python FastAPI service
    console.log(`Forwarding query to RAG Engine for session ${sessionId}...`);
    const aiResponse = await queryAIService(query, history);

    // 5. Append Assistant message with citations
    const assistantMessage = {
      sender: 'assistant',
      content: aiResponse.answer,
      citations: aiResponse.citations || []
    };
    
    chat.messages.push(assistantMessage);
    await chat.save();

    // Return the response, including the generated message IDs
    const lastUserMessage = chat.messages[chat.messages.length - 2];
    const lastAssistantMessage = chat.messages[chat.messages.length - 1];

    res.json({
      answer: aiResponse.answer,
      citations: aiResponse.citations || [],
      chatId: chat._id,
      userMessageId: lastUserMessage._id,
      assistantMessageId: lastAssistantMessage._id
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ detail: 'Server error processing message.' });
  }
};

// Get list of all chat sessions for the logged in user
exports.getSessionsList = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .select('sessionId title createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ detail: 'Server error retrieving conversation list.' });
  }
};

// Get a single session with message threads
exports.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chat = await Chat.findOne({ sessionId, userId: req.user.id });
    if (!chat) {
      return res.status(404).json({ detail: 'Conversation session not found.' });
    }
    res.json(chat);
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({ detail: 'Server error retrieving session details.' });
  }
};

// Delete a session
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await Chat.findOneAndDelete({ sessionId, userId: req.user.id });
    if (!result) {
      return res.status(404).json({ detail: 'Conversation session not found.' });
    }
    res.json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ detail: 'Server error deleting session.' });
  }
};

// Submit message feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { sessionId, messageId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!sessionId || !messageId || !rating) {
      return res.status(400).json({ detail: 'Missing feedback fields.' });
    }

    const chat = await Chat.findOne({ sessionId, userId });
    if (!chat) {
      return res.status(404).json({ detail: 'Conversation session not found.' });
    }

    // Find message inside chat
    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ detail: 'Message not found in session.' });
    }

    // Update feedback on message
    message.feedback = { rating, comment: comment || '' };
    await chat.save();

    // Also record feedback in separate Feedback collection
    await Feedback.create({
      userId,
      sessionId,
      rating,
      comment: comment || ''
    });

    res.json({ message: 'Feedback submitted successfully.', feedback: message.feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ detail: 'Server error saving feedback.' });
  }
};
