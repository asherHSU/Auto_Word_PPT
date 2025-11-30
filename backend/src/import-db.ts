import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

// MongoDB 設定
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'song_presentation';
const COLLECTION_NAME = 'songs';

// 🔍 智慧尋找路徑函式
function findJsonPath(): string | null {
    // 列出所有可能的路徑
    const possibilities = [
        // 1. Docker 環境標準路徑 (絕對路徑)
        '/app/resources/songs_db.json',
        
        // 2. 相對於當前執行目錄 (通常是 /app 或 專案根目錄)
        path.join(process.cwd(), 'resources', 'songs_db.json'),
        
        // 3. 相對於程式碼所在位置 (src/.. -> resources)
        path.join(__dirname, '../resources/songs_db.json'),
        
        // 4. 本機開發備用路徑 (src/../../resources)
        path.join(__dirname, '../../resources/songs_db.json')
    ];

    console.log("🔍 開始搜尋 songs_db.json...");
    console.log(`📂 當前工作目錄 (cwd): ${process.cwd()}`);
    console.log(`📂 程式碼目錄 (__dirname): ${__dirname}`);

    for (const p of possibilities) {
        console.log(`   👉 檢查路徑: ${p}`);
        if (fs.existsSync(p)) {
            console.log(`   ✅ 成功找到檔案！`);
            return p;
        }
    }
    return null;
}

async function importData() {
    const jsonPath = findJsonPath();

    if (!jsonPath) {
        console.error('\n❌ 嚴重錯誤：找不到 songs_db.json 檔案。');
        console.error('------------------------------------------------');
        console.error('請確認以下事項：');
        console.error('1. 您的 NAS 資料夾結構為： docker/church_app/resource/songs_db.json');
        console.error('   (注意：如果您的 NAS 資料夾叫 resource，docker-compose.yml 必須掛載正確)');
        console.error('2. 檔案名稱必須精確為 "songs_db.json" (注意大小寫)');
        console.error('------------------------------------------------\n');
        process.exit(1);
    }

    let client: MongoClient | null = null;

    try {
        console.log(`\n正在連線至 MongoDB...`);
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log('✅ 連線成功');

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // 讀取 JSON
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const songs = JSON.parse(rawData);
        console.log(`📖 從檔案讀取了 ${songs.length} 筆資料`);

        // 清空舊資料
        const deleteResult = await collection.deleteMany({});
        console.log(`🗑️  已刪除 ${deleteResult.deletedCount} 筆舊資料`);

        // 插入新資料
        if (songs.length > 0) {
            const insertResult = await collection.insertMany(songs);
            console.log(`🎉 成功匯入 ${insertResult.insertedCount} 筆新資料！`);
        } else {
            console.warn('⚠️ JSON 檔案是空的，未匯入任何資料。');
        }

    } catch (error) {
        console.error('❌ 匯入失敗:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('👋 關閉 MongoDB 連線');
        }
    }
}

importData();