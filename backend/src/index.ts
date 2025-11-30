import express, { Request, Response, NextFunction } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';
import cors from 'cors'; 
import morgan from 'morgan';
// 🔄 新增引入 clearFileCache
import { generateFiles, extractSongData, findPptPath, SongData, SongInput, clearFileCache } from './generator';
import winston from 'winston';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;

// ... (中間設定保持不變) ...
const PPT_LIBRARY_PATH = path.join(__dirname, '..', '..', "resources", "ppt_library");
if (!fs.existsSync(PPT_LIBRARY_PATH)) {
    fs.mkdirSync(PPT_LIBRARY_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PPT_LIBRARY_PATH)
  },
  filename: function (req, file, cb) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

app.use(cors()); 
app.use(morgan('dev')); 
app.use(express.json({ limit: '50mb' })); 

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'song_presentation';
const COLLECTION_NAME = 'songs';
const USERS_COLLECTION_NAME = 'users';
let dbClient: MongoClient;

async function connectToMongo() {
  try {
    dbClient = new MongoClient(MONGO_URI);
    await dbClient.connect();
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
  }
}
connectToMongo();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

interface AuthRequest extends Request {
  user?: { id: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user as { id: string };
    next();
  });
};

// ... (API Routes: login, register 保持不變) ...
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!dbClient) return res.status(500).json({ message: 'Database not connected' });
  
  const db = dbClient.db(DB_NAME);
  const user = await db.collection(USERS_COLLECTION_NAME).findOne({ username });
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username });
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!dbClient) return res.status(500).json({ message: 'Database not connected' });

    const db = dbClient.db(DB_NAME);
    const existing = await db.collection(USERS_COLLECTION_NAME).findOne({ username });
    if(existing) return res.status(409).json({ message: 'User exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection(USERS_COLLECTION_NAME).insertOne({ username, password: hashedPassword });
    res.json({ message: 'Admin created' });
});

// 1. Get Songs (With Status Check - Optimized)
app.get('/api/songs', async (req, res) => {
  try {
    if (!dbClient) return res.status(500).json({ message: 'Database not connected' });
    
    const db = dbClient.db(DB_NAME);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const name = req.query.name as string;

    let query: any = {};
    
    // 🛠️ 修改核心：如果有搜尋名稱，維持原樣；如果沒有搜尋名稱，則使用 ID 範圍分頁
    if (name) {
        query.name = { $regex: name, $options: 'i' };
        
        // 搜尋模式下，還是使用傳統的分頁 (skip/limit)，因為 ID 可能不連續且我們只關心搜尋結果
        const total = await db.collection(COLLECTION_NAME).countDocuments(query);
        const songs = await db.collection(COLLECTION_NAME)
          .find(query)
          .sort({ id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Check files...
        const songsWithStatus = await Promise.all(songs.map(async (song) => {
            // @ts-ignore
            const filePath = await findPptPath(PPT_LIBRARY_PATH, song);
            return { ...song, hasFile: !!filePath };
        }));

        return res.json({
            data: songsWithStatus,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } else {
        // 🛠️ 瀏覽模式：使用 ID 範圍查詢 (Range Query)
        const startId = (page - 1) * limit + 1;
        const endId = page * limit;

        // 設定查詢條件：ID 在 startId 與 endId 之間
        query.id = { $gte: startId, $lte: endId };

        // 這裡不需要 skip 和 limit，因為 query 已經限制了範圍
        const songs = await db.collection(COLLECTION_NAME)
          .find(query)
          .sort({ id: 1 })
          .toArray();

        // 為了計算總頁數，我們需要知道最大的 ID 是多少，而不是總筆數
        // 因為如果是 ID 範圍分頁，總頁數應該由 最大ID / 每頁筆數 決定
        const lastSong = await db.collection(COLLECTION_NAME).find().sort({ id: -1 }).limit(1).toArray();
        const maxId = lastSong[0]?.id || 0;
        
        // 實際上這個分頁模式下的 "total" 概念有點模糊，我們可以回傳 maxId 當作參考，或者維持 countDocuments
        // 為了讓前端分頁器正常工作，我們還是回傳總筆數，但 totalPages 改由 maxId 計算
        const totalDocs = await db.collection(COLLECTION_NAME).countDocuments({}); 

        // Check files...
        const songsWithStatus = await Promise.all(songs.map(async (song) => {
            // @ts-ignore
            const filePath = await findPptPath(PPT_LIBRARY_PATH, song);
            return { ...song, hasFile: !!filePath };
        }));

        res.json({
            data: songsWithStatus,
            pagination: {
                total: totalDocs,
                page,
                limit,
                // 關鍵：總頁數 = 最大 ID / 每頁筆數 (無條件進位)
                // 這樣即使中間缺號，分頁器也能顯示到最後一頁 (例如 ID 1278，limit 100 -> 13 頁)
                totalPages: Math.ceil(maxId / limit) 
            }
        });
    }

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Error fetching songs' });
  }
});

app.post('/api/preview', async (req, res) => {
    const { songs } = req.body;
    if (!songs || !Array.isArray(songs)) return res.status(400).json({ message: 'Invalid input' });

    try {
        const data = await extractSongData(songs, PPT_LIBRARY_PATH);
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: 'Preview failed' });
    }
});

app.post('/api/generate', async (req, res) => {
    const { songs, songData } = req.body; 
    try {
        let input = songData || songs;
        if (!input || !Array.isArray(input) || input.length === 0) {
             return res.status(400).json({ message: 'Missing songs data' });
        }

        const zipPath = await generateFiles(input);
        res.download(zipPath, '敬拜資源.zip', (err) => {
            if (!err && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Generation failed' });
    }
});

// 4. Upload Route (Updated to clear cache)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    logger.info(`File uploaded: ${req.file.originalname}`);
    
    // 🔄 關鍵：上傳後清除快取，強制下次讀取重新掃描
    clearFileCache();
    
    res.json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

// 5. CRUD Operations
app.post('/api/songs', authenticateToken, async (req, res) => {
    const db = dbClient.db(DB_NAME);
    const { name } = req.body;
    const lastSong = await db.collection(COLLECTION_NAME).find().sort({id: -1}).limit(1).toArray();
    const newId = (lastSong[0]?.id || 0) + 1;
    
    await db.collection(COLLECTION_NAME).insertOne({ id: newId, name });
    res.json({ message: 'Song added', id: newId });
});

app.put('/api/songs/:id', authenticateToken, async (req, res) => {
    const db = dbClient.db(DB_NAME);
    const id = parseInt(req.params.id);
    const { name } = req.body;
    await db.collection(COLLECTION_NAME).updateOne({ id }, { $set: { name } });
    res.json({ message: 'Song updated' });
});

app.delete('/api/songs/:id', authenticateToken, async (req, res) => {
    const db = dbClient.db(DB_NAME);
    const id = parseInt(req.params.id);
    await db.collection(COLLECTION_NAME).deleteOne({ id });
    res.json({ message: 'Song deleted' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});