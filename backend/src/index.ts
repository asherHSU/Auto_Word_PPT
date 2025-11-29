import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs';
import { generateFiles } from './generator';
import winston from 'winston'; // Import winston
import bcrypt from 'bcryptjs'; // Import bcryptjs
import jwt from 'jsonwebtoken'; // Import jsonwebtoken
import { Request, Response, NextFunction } from 'express'; // Import types for express

const app = express();
const port = 3000;

// --- Winston Logger Configuration ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Middleware to parse JSON request bodies
app.use(express.json());

// --- MongoDB Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'song_presentation';
const COLLECTION_NAME = 'songs';
const USERS_COLLECTION_NAME = 'users'; // New collection for users

let dbClient: MongoClient;

async function connectToMongo() {
  dbClient = new MongoClient(MONGO_URI);
  await dbClient.connect();
  logger.info('Connected to MongoDB');
}

// Connect to MongoDB on application startup
connectToMongo().catch((error) => logger.error('Failed to connect to MongoDB:', error));

// --- JWT Secret (Ideally from environment variables) ---
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // THIS SHOULD BE A STRONG, RANDOM SECRET!

// --- User Interface ---
interface User {
  _id?: ObjectId;
  username: string;
  password: string;
}

// --- Middleware for JWT Verification ---
interface AuthRequest extends Request {
  user?: { id: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication attempt without token.');
    return res.status(401).json({ message: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Failed authentication: Invalid token.');
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user as { id: string };
    next();
  });
};

// --- Authentication Endpoints ---

// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const db = dbClient.db(DB_NAME);
    const usersCollection = db.collection<User>(USERS_COLLECTION_NAME);
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '' ||
        !password || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ message: 'Username and password are required and must be non-empty strings.' });
    }

    const existingUser = await usersCollection.findOne({ username: username.trim() });
    if (existingUser) {
      logger.warn(`Registration attempt for existing username: ${username}`);
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const newUser: User = {
      username: username.trim(),
      password: hashedPassword,
    };

    const result = await usersCollection.insertOne(newUser);
    logger.info(`User registered: ${newUser.username}`);
    res.status(201).json({ message: 'User registered successfully.', userId: result.insertedId });
  } catch (error) {
    logger.error('Error during user registration:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const db = dbClient.db(DB_NAME);
    const usersCollection = db.collection<User>(USERS_COLLECTION_NAME);
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '' ||
        !password || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await usersCollection.findOne({ username: username.trim() });
    if (!user) {
      logger.warn(`Login attempt for non-existent user: ${username}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      logger.warn(`Login attempt with incorrect password for user: ${username}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id?.toHexString() }, JWT_SECRET, { expiresIn: '1h' });
    logger.info(`User logged in: ${username}`);
    res.json({ token });
  } catch (error) {
    logger.error('Error during user login:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// --- API Endpoints ---

// Root endpoint
app.get('/', (req, res) => {
  res.send({ message: 'Welcome to the Node.js API for Auto PPT Word' });
});

// Search songs endpoint
app.get('/api/songs', async (req, res) => {
  try {
    const db = dbClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const { id, name } = req.query;
    let query: any = {};

    if (id) {
      const parsedId = parseInt(id as string);
      if (isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({ message: 'If provided, song ID must be a positive number.' });
      }
      query.id = parsedId;
    }

    if (name) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'If provided, song name must be a non-empty string.' });
      }
      query.name = { $regex: name, $options: 'i' }; // Case-insensitive substring match
    }

    const songs = await collection.find(query).toArray();
    logger.info(`Found ${songs.length} songs for query: ${JSON.stringify(query)}`);
    res.json(songs);
  } catch (error) {
    logger.error('Error searching songs:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Add a new song
app.post('/api/songs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = dbClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const { name, id } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Song name is required and must be a non-empty string.' });
    }

    if (id !== undefined && (isNaN(parseInt(id)) || parseInt(id) <= 0)) {
      return res.status(400).json({ message: 'If provided, song ID must be a positive number.' });
    }

    const newSong = {
      id: id ? parseInt(id) : await collection.countDocuments() + 1, // Simple auto-increment for ID
      name: name.trim(),
    };

    const result = await collection.insertOne(newSong);
    logger.info(`User ${req.user?.id} added new song: ${JSON.stringify(newSong)}`);
    res.status(201).json(result.ops[0]);
  } catch (error) {
    logger.error('Error adding song:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update a song by ID
app.put('/api/songs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = dbClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const songId = parseInt(req.params.id);
    const { name } = req.body;

    if (isNaN(songId)) {
      return res.status(400).json({ message: 'Invalid song ID provided.' });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Song name is required and must be a non-empty string.' });
    }

    const result = await collection.updateOne(
      { id: songId },
      { $set: { name: name.trim() } }
    );

    if (result.matchedCount === 0) {
      logger.warn(`User ${req.user?.id} attempted to update non-existent song with ID: ${songId}`);
      return res.status(404).json({ message: 'Song not found.' });
    }

    const updatedSong = await collection.findOne({ id: songId });
    logger.info(`User ${req.user?.id} updated song with ID ${songId}: ${JSON.stringify(updatedSong)}`);
    res.json(updatedSong);
  } catch (error) {
    logger.error('Error updating song:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete a song by ID
app.delete('/api/songs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = dbClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const songId = parseInt(req.params.id);

    if (isNaN(songId)) {
      return res.status(400).json({ message: 'Invalid song ID provided.' });
    }

    const result = await collection.deleteOne({ id: songId });

    if (result.deletedCount === 0) {
      logger.warn(`User ${req.user?.id} attempted to delete non-existent song with ID: ${songId}`);
      return res.status(404).json({ message: 'Song not found.' });
    }

    logger.info(`User ${req.user?.id} deleted song with ID: ${songId}`);
    res.status(204).send(); // No content to send back for a successful deletion
  } catch (error) {
    logger.error('Error deleting song:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Generate files endpoint (protected)
app.post('/api/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { songs } = req.body; // Expects an array of song titles
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({ message: 'Request body must contain a non-empty array of song titles.' });
    }

    // Validate each song title in the array
    for (const songTitle of songs) {
      if (typeof songTitle !== 'string' || songTitle.trim() === '') {
        return res.status(400).json({ message: 'All song titles in the array must be non-empty strings.' });
      }
    }

    logger.info(`User ${req.user?.id} generating files for songs: ${JSON.stringify(songs)}`);
    const zipPath = await generateFiles(songs);
    logger.info('Generated ZIP path:', zipPath);

    if (!fs.existsSync(zipPath)) {
      logger.error('Generated ZIP file does not exist:', zipPath);
      return res.status(500).json({ message: 'Generated ZIP file not found.' });
    }

    // Send the zip file as a response
    res.download(zipPath, '敬拜資源.zip', (err) => {
      if (err) {
        logger.error('Error sending file:', err);
      }
      // Clean up the generated zip file after sending
      fs.unlinkSync(zipPath);
      logger.info(`Cleaned up generated ZIP file: ${zipPath}`);
    });

  } catch (error) {
    logger.error('Error in /api/generate:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
