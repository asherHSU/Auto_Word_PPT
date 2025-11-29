import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

// --- 設定 ---
// 從環境變數讀取 MongoDB 連線字串，如果沒有就使用本地預設值
// 您的 NAS IP 位址需要替換 'localhost'
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017'; 
const DB_NAME = 'song_presentation';
const COLLECTION_NAME = 'songs';

// JSON 資料來源路徑 (位於專案根目錄的 resources 資料夾)
const JSON_PATH = path.join(__dirname, '..', '..', 'resources', 'songs_db.json');

async function importData() {
  const client = new MongoClient(MONGO_URI);

  try {
    // -------------------- 1. 連線到 MongoDB --------------------
    await client.connect();
    console.log('成功連線到 MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // -------------------- 2. 清空舊資料 (可選) --------------------
    // 為了避免重複匯入，我們先刪除所有已存在的歌曲
    const deleteResult = await collection.deleteMany({});
    console.log(`已刪除 ${deleteResult.deletedCount} 筆舊資料`);

    // -------------------- 3. 讀取 JSON 檔案 --------------------
    if (!fs.existsSync(JSON_PATH)) {
      console.error(`錯誤：找不到 JSON 檔案於 ${JSON_PATH}`);
      return;
    }
    const jsonData = fs.readFileSync(JSON_PATH, 'utf-8');
    const songs = JSON.parse(jsonData);
    console.log(`從 JSON 檔案中讀取了 ${songs.length} 筆歌曲資料`);

    // -------------------- 4. 插入新資料 --------------------
    if (songs.length > 0) {
      const insertResult = await collection.insertMany(songs);
      console.log(`成功匯入 ${insertResult.insertedCount} 筆新資料到 '${COLLECTION_NAME}' collection`);
    } else {
      console.log('沒有資料需要匯入');
    }

  } catch (error) {
    console.error('匯入資料時發生錯誤:', error);
  } finally {
    // -------------------- 5. 關閉連線 --------------------
    await client.close();
    console.log('關閉 MongoDB 連線');
  }
}

// 執行匯入
importData();
