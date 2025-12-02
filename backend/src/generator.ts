import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import archiver from 'archiver';
import winston from 'winston';

const generatorLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'generator.log' }),
  ],
});

export interface SongInput {
    id: number;
    name: string;
}

export interface SongData {
  title: string;
  lyrics: string[];
}

// 🚀 第一部分：Node.js 快速檔案掃描 (解決缺檔顯示問題)

let fileCache: { name: string; path: string; normalized: string }[] | null = null;

// 輔助：正規化字串 (去除非英數中文並轉小寫)
function normalizeString(str: string): string {
    if (!str) return ""; // 防止 undefined 導致 crash
    return str.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
}

// 遞迴建立檔案快取
function buildFileCache(rootPath: string) {
    if (!fs.existsSync(rootPath)) {
        generatorLogger.warn(`⚠️ Path does not exist: ${rootPath}`);
        return;
    }

    const files: { name: string; path: string; normalized: string }[] = [];
    
    function traverse(currentPath: string) {
        if (!fs.existsSync(currentPath)) return;
        try {
            const items = fs.readdirSync(currentPath);
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    traverse(fullPath);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (ext === '.pptx' || ext === '.ppt') {
                        const fileName = path.basename(item, ext);
                        files.push({
                            name: fileName,
                            path: fullPath,
                            normalized: normalizeString(fileName)
                        });
                    }
                }
            }
        } catch (e) {
            // ignore permission errors etc.
        }
    }
    
    traverse(rootPath);
    fileCache = files;
    generatorLogger.info(`✅ Cache built. Found ${files.length} presentation files in ${rootPath}`);
}

export function clearFileCache() {
    fileCache = null;
    generatorLogger.info('🔄 File cache cleared.');
}

// 尋找 PPT 路徑
export async function findPptPath(rootPath: string, song: SongInput): Promise<string | null> {
    if (!fileCache) {
        buildFileCache(rootPath);
    }

    if (!fileCache) return null;

    if (!song || !song.name) return null;

    const targetName = normalizeString(song.name);
    // 比對 ID (例如 "001" 或 "1")
    const idRegex = new RegExp(`^0*${song.id}([^0-9]|$)`);

    for (const file of fileCache) {
        // 優先比對 ID
        if (idRegex.test(file.name)) {
            return file.path;
        }
        // 其次比對歌名 (模糊比對)
        if (file.normalized.includes(targetName)) {
            return file.path;
        }
    }
    return null;
}


// 🐍 第二部分：Python 腳本呼叫

async function runPythonScript(mode: 'preview' | 'generate', payload: any, outputDir?: string): Promise<any> {
    // 🛠️ 修正：使用 process.cwd() 確保指向 /app (Docker) 或 專案根目錄 (Local)
    const PROJECT_ROOT = process.cwd(); 
    const RESOURCES_DIR = path.join(PROJECT_ROOT, 'resources');
    // 注意：腳本位置相對於 __dirname (dist/src) 
    const SCRIPT_PATH = path.join(__dirname, '../scripts/generator.py');

    return new Promise((resolve, reject) => {
        // 參數順序: script.py [mode] [json_data] [resources_dir] [output_dir?]
        const args = [SCRIPT_PATH, mode, JSON.stringify(payload), RESOURCES_DIR];
        if (outputDir) args.push(outputDir);

        generatorLogger.info(`🐍 Running Python: ${mode}`);
        generatorLogger.info(`📂 Resources Dir: ${RESOURCES_DIR}`);
        
        // 使用 spawn 執行 python
        const py = spawn('python', args);

        let stdoutData = '';
        let stderrData = '';

        py.stdout.on('data', (data) => { stdoutData += data.toString(); });
        py.stderr.on('data', (data) => { stderrData += data.toString(); });

        py.on('close', (code) => {
            if (code !== 0) {
                generatorLogger.error(`Python error (${code}): ${stderrData}`);
                return reject(new Error(`Python script failed: ${stderrData}`));
            }
            
            try {
                // Python 可能會輸出多行 log，我們只需要最後一行的 JSON 結果
                const lines = stdoutData.trim().split('\n');
                let result = null;
                
                // 從最後一行往回找 JSON
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const json = JSON.parse(lines[i]);
                        if (json && (Array.isArray(json) || json.status || json.error)) {
                            result = json;
                            break;
                        }
                    } catch (e) { continue; }
                }

                if (!result) throw new Error('No JSON found in Python output');
                if (result.error) return reject(new Error(result.error));
                
                resolve(result);
            } catch (e) {
                generatorLogger.error(`Invalid JSON from Python. Output: ${stdoutData}`);
                reject(new Error('Invalid response from Python script'));
            }
        });
    });
}

// 預覽功能
export async function extractSongData(songs: SongInput[] | any[], pptLibraryPath: string): Promise<SongData[]> {
    const simplifiedSongs = songs.map(s => ({ 
        id: s.id || 0, 
        name: s.name || s.title 
    }));
    
    try {
        const result = await runPythonScript('preview', simplifiedSongs);
        return result as SongData[];
    } catch (e) {
        generatorLogger.error('Preview failed', e);
        throw e;
    }
}

// 生成檔案功能
export async function generateFiles(input: SongInput[] | SongData[]): Promise<string> {
    // 🛠️ 修正：使用 process.cwd() 確保路徑正確
    const PROJECT_ROOT = process.cwd();
    const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
    
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const zipPath = path.join(OUTPUT_DIR, "presentation_files.zip");
    const outputDocx = path.join(OUTPUT_DIR, "敬拜大字報.docx");
    const outputPptx = path.join(OUTPUT_DIR, "敬拜PPT.pptx");

    try {
        // Python 腳本會接收 RESOURCES_DIR 並透過其內部的 find_ppt_path 遞迴搜尋
        await runPythonScript('generate', input, OUTPUT_DIR);
        
        // 開始打包 ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                generatorLogger.info(`Zip created: ${archive.pointer()} total bytes`);
                resolve(zipPath);
            });
            archive.on('error', (err) => reject(err));
            
            archive.pipe(output);
            
            if (fs.existsSync(outputDocx)) {
                archive.file(outputDocx, { name: '敬拜大字報.docx' });
            } else {
                generatorLogger.warn('Word file not found after Python execution');
            }
            
            if (fs.existsSync(outputPptx)) {
                archive.file(outputPptx, { name: '敬拜PPT.pptx' });
            } else {
                generatorLogger.warn('PPT file not found after Python execution');
            }
            
            archive.finalize();
        });

    } catch (e) {
        generatorLogger.error('Generate failed', e);
        throw e;
    }
}