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

export function clearFileCache() {
    generatorLogger.info('Cache cleared (Python mode: no-op)');
}

/**
 * 核心函式：呼叫 Python 腳本
 */
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
                // 嘗試解析 JSON 輸出
                // 注意：Python 可能會印出其他 log，我們需要找到最後一行 JSON
                const lines = stdoutData.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const result = JSON.parse(lastLine);
                
                if (result.error) return reject(new Error(result.error));
                resolve(result);
            } catch (e) {
                generatorLogger.error(`Invalid JSON from Python: ${stdoutData}`);
                reject(new Error('Invalid response from Python script'));
            }
        });
    });
}

/**
 * 預覽功能：呼叫 Python 獲取歌詞
 */
export async function extractSongData(songs: SongInput[] | any[], pptLibraryPath: string): Promise<SongData[]> {
    try {
        const result = await runPythonScript('preview', songs);
        return result as SongData[];
    } catch (e) {
        generatorLogger.error('Preview failed', e);
        throw e;
    }
}

/**
 * 生成功能：呼叫 Python 產生檔案並打包
 */
export async function generateFiles(input: SongInput[] | SongData[]): Promise<string> {
    const PROJECT_ROOT = path.join(__dirname, '..', '..');
    const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
    
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const zipPath = path.join(OUTPUT_DIR, "presentation_files.zip");
    const outputDocx = path.join(OUTPUT_DIR, "敬拜大字報.docx");
    const outputPptx = path.join(OUTPUT_DIR, "敬拜PPT.pptx");

    // 準備輸入資料
    // 如果 input 是 SongData (前端編輯過的)，直接傳；如果是 SongInput (ID列表)，也直接傳
    // Python 腳本會根據內容欄位 (是否有 lyrics) 來判斷
    
    try {
        await runPythonScript('generate', input, OUTPUT_DIR);
        
        // 打包 Zip
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(zipPath));
            archive.on('error', (err) => reject(err));
            archive.pipe(output);
            if (fs.existsSync(outputDocx)) archive.file(outputDocx, { name: '敬拜大字報.docx' });
            if (fs.existsSync(outputPptx)) archive.file(outputPptx, { name: '敬拜PPT.pptx' });
            archive.finalize();
        });

    } catch (e) {
        generatorLogger.error('Generate failed', e);
        throw e;
    }
}

// 用於 API 的 findPptPath 暫時保留空殼，因為預覽已經移交給 Python
export async function findPptPath(rootPath: string, song: SongInput): Promise<string | null> {
    return null; // 前端狀態檢查可能暫時失效，若需要可再用 Python 實作這部分
}