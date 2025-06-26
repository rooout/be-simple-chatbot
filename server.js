const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const net = require('net');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'https://fe-simple-chatbot.vercel.app',
      'https://fe-simple-chatbot-git-main-routs-projects-75242813.vercel.app',
      'https://fe-simple-chatbot-e4eo3f61k-routs-projects-75242813.vercel.app'
    ];
    
    const isVercelDomain = origin && (
      origin.includes('fe-simple-chatbot') && origin.includes('vercel.app')
    );
    
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production' && origin && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || isVercelDomain) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const materialRecommendations = [
  {
    id: 1,
    title: "Introduction to AI and Machine Learning",
    description: "A comprehensive guide to understanding AI fundamentals",
    type: "article",
    url: "https://example.com/ai-intro",
    difficulty: "beginner",
    estimatedTime: "15 min read",
    tags: ["AI", "Machine Learning", "Beginner"]
  },
  {
    id: 2,
    title: "Natural Language Processing Basics",
    description: "Learn the fundamentals of NLP and text processing",
    type: "video",
    url: "https://example.com/nlp-basics",
    difficulty: "intermediate",
    estimatedTime: "30 min watch",
    tags: ["NLP", "Text Processing", "AI"]
  },
  {
    id: 3,
    title: "Building Chatbots with Modern APIs",
    description: "Step-by-step guide to creating intelligent chatbots",
    type: "tutorial",
    url: "https://example.com/chatbot-tutorial",
    difficulty: "intermediate",
    estimatedTime: "45 min read",
    tags: ["Chatbots", "APIs", "Development"]
  },
  {
    id: 4,
    title: "Advanced Prompt Engineering",
    description: "Master the art of crafting effective AI prompts",
    type: "course",
    url: "https://example.com/prompt-engineering",
    difficulty: "advanced",
    estimatedTime: "2 hours",
    tags: ["Prompts", "AI", "Advanced"]
  },
  {
    id: 5,
    title: "Ethics in AI Development",
    description: "Understanding responsible AI development practices",
    type: "article",
    url: "https://example.com/ai-ethics",
    difficulty: "beginner",
    estimatedTime: "20 min read",
    tags: ["Ethics", "AI", "Responsibility"]
  }
];

function getRelevantRecommendations(message, limit = 3) {
  const keywords = message.toLowerCase().split(' ');
  const scored = materialRecommendations.map(material => {
    let score = 0;
    const searchText = (material.title + ' ' + material.description + ' ' + material.tags.join(' ')).toLowerCase();
    
    keywords.forEach(keyword => {
      if (searchText.includes(keyword)) {
        score += 1;
      }
    });
    
    return { ...material, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    console.log('Received chat request:', { message: message?.substring(0, 50) + '...', historyLength: conversationHistory.length });
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    let prompt = `You are a helpful AI assistant. Be concise, accurate, and friendly in your responses.`;
    
    if (conversationHistory.length > 0) {
      prompt += `\n\nConversation history:\n`;
      conversationHistory.forEach((msg, index) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    prompt += `\nUser: ${message}\nAssistant:`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('Received response from Gemini API:', aiResponse.substring(0, 100) + '...');

    const recommendations = getRelevantRecommendations(message);

    res.json({
      response: aiResponse,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.message.includes('API_KEY')) {
      return res.status(500).json({ 
        error: 'AI service configuration error',
        message: 'Please check API key configuration' 
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({ 
        error: 'Service temporarily unavailable',
        message: 'API quota exceeded, please try again later' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate response',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/chat/image', upload.single('image'), async (req, res) => {
  try {
    const { message } = req.body;
    const imageFile = req.file;
    
    let conversationHistory = [];
    if (req.body.conversationHistory) {
      try {
        conversationHistory = typeof req.body.conversationHistory === 'string' 
          ? JSON.parse(req.body.conversationHistory) 
          : req.body.conversationHistory;
      } catch (parseError) {
        console.error('Error parsing conversationHistory:', parseError);
        conversationHistory = [];
      }
    }
    
    console.log('Received image chat request:', { 
      message: message?.substring(0, 50) + '...', 
      historyLength: conversationHistory.length,
      hasImage: !!imageFile 
    });
    
    if (!message && !imageFile) {
      return res.status(400).json({ error: 'Message or image is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    let prompt = `You are a helpful AI assistant. Analyze the image if provided and respond to the user's message. Be concise, accurate, and friendly.`;
    
    if (conversationHistory.length > 0) {
      prompt += `\n\nConversation history:\n`;
      conversationHistory.forEach((msg, index) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    if (message) {
      prompt += `\n\nUser message: ${message}`;
    }

    let parts = [{ text: prompt }];
    
    if (imageFile) {
      parts.push({
        inlineData: {
          mimeType: imageFile.mimetype,
          data: imageFile.buffer.toString('base64')
        }
      });
    }

    console.log('Sending image request to Gemini API...');
    const result = await model.generateContent(parts);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('Received image response from Gemini API:', aiResponse.substring(0, 100) + '...');

    const searchText = message || 'image analysis';
    const recommendations = getRelevantRecommendations(searchText);

    res.json({
      response: aiResponse,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image chat error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.message.includes('API_KEY')) {
      return res.status(500).json({ 
        error: 'AI service configuration error',
        message: 'Please check API key configuration' 
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({ 
        error: 'Service temporarily unavailable',
        message: 'API quota exceeded, please try again later' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate response',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/recommendations', (req, res) => {
  const { category, difficulty, limit = 10 } = req.query;
  
  let filtered = materialRecommendations;
  
  if (category) {
    filtered = filtered.filter(material => 
      material.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
    );
  }
  
  if (difficulty) {
    filtered = filtered.filter(material => material.difficulty === difficulty);
  }
  
  res.json({
    recommendations: filtered.slice(0, parseInt(limit)),
    total: filtered.length
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
};

const startServer = async () => {
  const targetPort = port;
  
  try {
    app.listen(targetPort, () => {
      console.log(`Server running on port ${targetPort}`);
      console.log(`Gemini API configured: ${!!process.env.GEMINI_API_KEY}`);
      console.log(`API endpoints available at http://localhost:${targetPort}/api`);
    });
  } catch (error) {
    console.error(`Failed to start server on port ${targetPort}:`, error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
