"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const fs = __importStar(require("fs"));
const generator_1 = require("./generator");
const app = (0, express_1.default)();
const port = 3000;
// Middleware to parse JSON request bodies
app.use(express_1.default.json());
// --- MongoDB Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'song_presentation';
const COLLECTION_NAME = 'songs';
let dbClient;
async function connectToMongo() {
    dbClient = new mongodb_1.MongoClient(MONGO_URI);
    await dbClient.connect();
    console.log('Connected to MongoDB');
}
// Connect to MongoDB on application startup
connectToMongo().catch(console.error);
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
        let query = {};
        if (id) {
            // MongoDB stores id as ObjectId by default, but our imported data uses 'id' as a number
            query.id = parseInt(id);
        }
        if (name) {
            query.name = { $regex: name, $options: 'i' }; // Case-insensitive substring match
        }
        const songs = await collection.find(query).toArray();
        res.json(songs);
    }
    catch (error) {
        console.error('Error searching songs:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Generate files endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { songs } = req.body; // Expects an array of song titles
        if (!songs || !Array.isArray(songs) || songs.length === 0) {
            return res.status(400).json({ message: 'Request body must contain a non-empty array of song titles.' });
        }
        const zipPath = await (0, generator_1.generateFiles)(songs);
        console.log('Generated ZIP path:', zipPath);
        if (!fs.existsSync(zipPath)) {
            console.error('Generated ZIP file does not exist:', zipPath);
            return res.status(500).json({ message: 'Generated ZIP file not found.' });
        }
        // Send the zip file as a response
        res.download(zipPath, '敬拜資源.zip', (err) => {
            if (err) {
                console.error('Error sending file:', err);
            }
            // Clean up the generated zip file after sending
            fs.unlinkSync(zipPath);
        });
    }
    catch (error) {
        console.error('Error in /api/generate:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
