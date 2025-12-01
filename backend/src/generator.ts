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

// 🛠️ 關鍵修正：加入空值檢查
function normalizeString(str: string): string {
    if (!str) return ""; // 防止 undefined 導致 crash
    return str.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
}

function buildFileCache(rootPath: string) {
    if (!fs.existsSync(rootPath)) return;

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
            // ignore
        }
    }
    
    traverse(rootPath);
    fileCache = files;
    generatorLogger.info(`✅ Cache built. Found ${files.length} presentation files.`);
}

export function clearFileCache() {
    fileCache = null;
    generatorLogger.info('🔄 File cache cleared.');
}

export async function findPptPath(rootPath: string, song: SongInput): Promise<string | null> {
    if (!fileCache) {
        buildFileCache(rootPath);
    }

    if (!fileCache) return null;

    // 🛠️ 關鍵修正：確保 song 與 song.name 存在
    if (!song || !song.name) return null;

    const targetName = normalizeString(song.name);
    const idRegex = new RegExp(`^0*${song.id}([^0-9]|$)`);

    for (const file of fileCache) {
        if (idRegex.test(file.name)) {
            return file.path;
        }
        if (file.normalized.includes(targetName)) {
            return file.path;
        }
    }
    return null;
}


// 🐍 第二部分：Python 腳本呼叫

async function runPythonScript(mode: 'preview' | 'generate', payload: any, outputDir?: string): Promise<any> {
    const PROJECT_ROOT = path.join(__dirname, '..', '..');
    const RESOURCES_DIR = path.join(PROJECT_ROOT, 'resources');
    const SCRIPT_PATH = path.join(__dirname, '../scripts/generator.py');

    return new Promise((resolve, reject) => {
        const args = [SCRIPT_PATH, mode, JSON.stringify(payload), RESOURCES_DIR];
        if (outputDir) args.push(outputDir);

        generatorLogger.info(`🐍 Running Python: ${mode}`);
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
                const lines = stdoutData.trim().split('\n');
                let result = null;
                
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

export async function generateFiles(input: SongInput[] | SongData[]): Promise<string> {
    const PROJECT_ROOT = path.join(__dirname, '..', '..');
    const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
    
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const zipPath = path.join(OUTPUT_DIR, "presentation_files.zip");
    const outputDocx = path.join(OUTPUT_DIR, "敬拜大字報.docx");
    const outputPptx = path.join(OUTPUT_DIR, "敬拜PPT.pptx");

    try {
        await runPythonScript('generate', input, OUTPUT_DIR);
        
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