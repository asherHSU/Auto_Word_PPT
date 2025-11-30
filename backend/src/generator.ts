import * as fs from 'fs';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, ISectionOptions, SectionType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import archiver from 'archiver';
import textract from 'textract';
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

export interface SongData {
  title: string;
  lyrics: string[];
  isPptOldFormat?: boolean;
  found?: boolean;
}

export interface SongInput {
    id: number;
    name: string;
}

function cleanText(text: string): string {
  return text.replace(/[\x00-\x08\x0e-\x1f]/g, '');
}

function normalizeString(str: string): string {
    return str.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
}

// 🔥 全域快取 (Global Cache)
// 儲存掃描到的所有 PPT 檔案資訊，避免重複掃描硬碟
let fileCache: { name: string; path: string; normalized: string }[] | null = null;

/**
 * 🔄 清除快取 (Exported Function)
 * 當有新檔案上傳時呼叫此函式，強制下次搜尋時重新掃描硬碟
 */
export function clearFileCache() {
    fileCache = null;
    generatorLogger.info('🔄 File cache cleared.');
}

/**
 * 建立檔案索引 (只掃描一次硬碟)
 */
function buildFileCache(rootPath: string) {
    generatorLogger.info(`📂 Building file cache from: ${rootPath}`);
    const files: { name: string; path: string; normalized: string }[] = [];
    
    function traverse(currentPath: string) {
        if (!fs.existsSync(currentPath)) return;
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            try {
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
            } catch (e) {
                // 忽略無法讀取的檔案
            }
        }
    }
    
    traverse(rootPath);
    fileCache = files;
    generatorLogger.info(`✅ Cache built. Found ${files.length} presentation files.`);
}

/**
 * 搜尋 PPT 檔案 (改為使用記憶體快取)
 */
export async function findPptPath(rootPath: string, song: SongInput): Promise<string | null> {
  // 1. 如果快取是空的，先建立快取
  if (!fileCache) {
      buildFileCache(rootPath);
  }

  const targetName = normalizeString(song.name);
  // Regex: 匹配開頭是 ID，且後面接非數字的字元
  const idRegex = new RegExp(`^0*${song.id}([^0-9]|$)`);

  // 2. 在記憶體中搜尋 (速度極快)
  if (fileCache) {
      for (const file of fileCache) {
        // 優先：ID 比對
        if (idRegex.test(file.name)) {
            return file.path;
        }
        // 備案：檔名包含歌名
        if (file.normalized.includes(targetName)) {
            return file.path;
        }
      }
  }
  
  return null;
}

export async function extractSongData(songs: SongInput[], pptLibraryPath: string): Promise<SongData[]> {
    generatorLogger.info(`--- 開始提取資料 (共 ${songs.length} 首) ---`);
    const songsData: SongData[] = [];

    // 確保快取已建立
    if (!fileCache) buildFileCache(pptLibraryPath);

    for (const song of songs) {
        const songInfo: SongData = { title: song.name, lyrics: [], isPptOldFormat: false, found: false };
        const pptPath = await findPptPath(pptLibraryPath, song);

        if (!pptPath) {
            // generatorLogger.warn(`❌ 找不到檔案 (ID: ${song.id}, Name: ${song.name})`);
            songsData.push(songInfo);
            continue;
        }

        songInfo.found = true;
        if (pptPath.toLowerCase().endsWith(".ppt")) {
            songInfo.isPptOldFormat = true;
            songsData.push(songInfo);
            continue;
        }

        try {
            const text = await new Promise<string>((resolve, reject) => {
                textract.fromFileWithPath(pptPath, (err, text) => {
                    if (err) reject(err);
                    else resolve(text);
                });
            });
            const lines = text.split('\n')
                .map(line => cleanText(line.trim()))
                .filter(line => line.length > 0);
            
            songInfo.lyrics = lines;
        } catch (error) {
            generatorLogger.error(`提取失敗: ${song.name}`, error);
        }
        songsData.push(songInfo);
    }
    return songsData;
}

export async function generateWordDocument(songsData: SongData[], outputPath: string): Promise<void> {
    const sections: ISectionOptions[] = [];

    for (const song of songsData) {
        const children = [
            new Paragraph({
                text: `【${song.title}】`,
                style: "SongTitle",
            }),
        ];

        if (!song.lyrics || song.lyrics.length === 0) {
            const warning = !song.found ? "【找不到檔案】" : "【無歌詞內容】";
            children.push(new Paragraph({ children: [new TextRun({ text: warning, bold: true, color: "FF0000" })] }));
        } else {
            for (const line of song.lyrics) {
                children.push(new Paragraph({ text: line, style: "Lyrics" }));
            }
        }
        children.push(new Paragraph("")); 
        sections.push({ properties: { type: SectionType.NEXT_PAGE }, children });
    }

    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "SongTitle",
                    name: "Song Title",
                    run: { font: "微軟正黑體", size: 36, bold: true }, 
                    paragraph: { spacing: { after: 200 } }
                },
                {
                    id: "Lyrics",
                    name: "Lyrics",
                    run: { font: "微軟正黑體", size: 28 }, 
                    paragraph: { spacing: { line: 360 } } 
                },
            ],
        },
        sections: sections,
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
}

export async function generateProjectionPpt(songsData: SongData[], outputPath: string): Promise<void> {
    const pres = new PptxGenJS();
    pres.layout = '16x9';

    const fontName = '微軟正黑體';
    const linesPerSlide = 2; 

    for (const song of songsData) {
        if (!song.lyrics || song.lyrics.length === 0) continue;

        const titleSlide = pres.addSlide();
        titleSlide.background = { color: '000000' };
        titleSlide.addText(song.title, {
            x: 0, y: 0, w: '100%', h: '100%',
            align: 'center', valign: 'middle',
            fontFace: fontName, fontSize: 60, color: 'FFFFFF', bold: true,
        });

        for (let i = 0; i < song.lyrics.length; i += linesPerSlide) {
            const slide = pres.addSlide();
            slide.background = { color: '000000' };

            const lyricsChunk = song.lyrics.slice(i, i + linesPerSlide);
            const lyricsText = lyricsChunk.join('\n');

            slide.addText(lyricsText, {
                x: 0.5, y: 0.5, w: '90%', h: '80%',
                align: 'center', valign: 'middle',
                fontFace: fontName, fontSize: 54, color: 'FFFF00', bold: true,
                lineSpacing: 60
            });

            slide.addText(song.title, {
                x: 0.5, y: '92%', w: '90%', h: '8%',
                align: 'right', fontSize: 18, color: '808080', fontFace: fontName
            });
        }
    }

    await pres.writeFile({ fileName: outputPath });
}

export async function generateFiles(input: SongInput[] | SongData[]): Promise<string> {
    const PROJECT_ROOT = path.join(__dirname, '..', '..');
    const PPT_LIBRARY_PATH = path.join(PROJECT_ROOT, "resources", "ppt_library");
    const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const outputDocxPath = path.join(OUTPUT_DIR, "敬拜大字報.docx");
    const outputPptxPath = path.join(OUTPUT_DIR, "敬拜PPT.pptx");
    const zipPath = path.join(OUTPUT_DIR, "presentation_files.zip");

    let songsData: SongData[];
    
    if (input.length > 0 && 'id' in input[0]) {
        songsData = await extractSongData(input as SongInput[], PPT_LIBRARY_PATH);
    } else {
        songsData = input as SongData[];
    }

    await generateWordDocument(songsData, outputDocxPath);
    await generateProjectionPpt(songsData, outputPptxPath);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve(zipPath));
        archive.on('error', (err) => reject(err));
        archive.pipe(output);
        archive.file(outputDocxPath, { name: '敬拜大字報.docx' });
        archive.file(outputPptxPath, { name: '敬拜PPT.pptx' });
        archive.finalize();
    });
}