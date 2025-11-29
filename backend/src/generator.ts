import * as fs from 'fs';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, ISectionOptions, SectionType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import archiver from 'archiver';
import textract from 'textract';
import winston from 'winston'; // Import winston

// --- Winston Logger Configuration for Generator ---
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
    new winston.transports.File({ filename: 'generator-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'generator-combined.log' }),
  ],
});

// --- Interfaces ---
interface SongData {
  title: string;
  lyrics: string[];
  isPptOldFormat: boolean;
  found: boolean;
}

// --- Core Functions ---

export async function findPptPath(rootPath: string, songTitle: string): Promise<string | null> {
  const files = fs.readdirSync(rootPath);

  for (const file of files) {
    const filePath = path.join(rootPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const result = await findPptPath(filePath, songTitle);
      if (result) {
        return result;
      }
    } else if (stat.isFile()) {
      const fileName = path.basename(filePath, path.extname(filePath));
      const titleFromFile = fileName.includes('-')
        ? fileName.split('-').slice(1).join('-').trim()
        : fileName.includes(' ')
        ? fileName.split(' ').slice(1).join(' ').trim()
        : fileName.trim();

      if (titleFromFile.toLowerCase() === songTitle.toLowerCase()) {
        generatorLogger.info(`  > Found PPT for '${songTitle}': ${filePath}`);
        return filePath;
      }
    }
  }

  return null;
}

function cleanText(text: string): string {
  // Removes incompatible XML control characters but keeps newline, carriage return, and tab
  return text.replace(/[\x00-\x08\x0e-\x1f]/g, '');
}

export async function extractSongData(songOrder: string[], pptLibraryPath: string): Promise<SongData[]> {
    generatorLogger.info("--- 階段一：提取歌詞資料 ---");
    const songsData: SongData[] = [];

    for (const songTitle of songOrder) {
        generatorLogger.info(`正在處理歌曲: ${songTitle}...`);
        const pptPath = await findPptPath(pptLibraryPath, songTitle);

        const songInfo: SongData = { title: songTitle, lyrics: [], isPptOldFormat: false, found: false };

        if (!pptPath) {
            generatorLogger.warn(`  > 警告: 在資料庫中找不到 '${songTitle}' 的檔案。`);
            songsData.push(songInfo);
            continue;
        }

        songInfo.found = true;

        if (pptPath.toLowerCase().endsWith(".ppt")) {
            generatorLogger.warn(`  > 警告: '${songTitle}' 是舊版 .ppt 格式，無法自動提取歌詞。`);
            songInfo.isPptOldFormat = true;
            songsData.push(songInfo);
            continue;
        }

        generatorLogger.info(`  > 找到了: ${path.basename(pptPath)}`);

        try {
            const text = await new Promise<string>((resolve, reject) => {
                textract.fromFileWithPath(pptPath, (err, text) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(text);
                });
            });

            const lines = text.split('\n').map(line => cleanText(line.trim())).filter(line => line);
            songInfo.lyrics = lines;
        } catch (error) {
            generatorLogger.error(`  > 錯誤: 無法從 '${songTitle}' 提取文字:`, error);
        }

        songsData.push(songInfo);
    }

    generatorLogger.info("--- 歌詞資料提取完成 ---");
    return songsData;
}



export async function generateWordDocument(songsData: SongData[], templatePath: string, outputPath: string): Promise<void> {
    generatorLogger.info("--- 階段二：生成 Word 大字報 ---");

    const sections: ISectionOptions[] = [];

    for (const song of songsData) {
        const children = [
            new Paragraph({
                text: `【${song.title}】`,
                style: "SongTitle",
            }),
        ];

        if (!song.lyrics || song.lyrics.length === 0) {
            let warningText = "";
            if (!song.found) {
                warningText = "【警告：在詩歌庫中找不到這首歌的檔案，請檢查歌名是否完全匹配】";
            } else if (song.isPptOldFormat) {
                warningText = "【注意：此歌曲為舊版.ppt格式，無法自動匯入，請手動處理】";
            } else {
                warningText = "【注意：找到了檔案，但未能成功提取任何歌詞】";
            }
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: warningText,
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph(""), // Add an empty paragraph for spacing
            );
        } else {
            for (const line of song.lyrics) {
                children.push(
                    new Paragraph({
                        text: line,
                        style: "Lyrics",
                    }),
                );
            }
            children.push(new Paragraph("")); // Add an empty paragraph for spacing
        }
        sections.push({ properties: { type: SectionType.NEXT_PAGE }, children: children });
    }

    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "SongTitle",
                    name: "Song Title",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        font: "微軟正黑體",
                        size: 28,
                        bold: true,
                    },
                },
                {
                    id: "Lyrics",
                    name: "Lyrics",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        font: "微軟正黑體",
                        size: 24,
                    },
                },
            ],
        },
        sections: sections,
    });


    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    generatorLogger.info(`--- Word 大字報已成功儲存至 '${outputPath}' ---`);
}

export async function generateProjectionPpt(songsData: SongData[], outputPath: string, linesPerSlide: number = 4): Promise<void> {
    generatorLogger.info("--- 階段三：生成投影用 PPT ---");
    const pres = new PptxGenJS();
    pres.layout = '16x9';

    // Style settings
    const blackFill = { color: '000000' };
    const yellowText = { color: 'FFFF00' };
    const fontName = '微軟正黑體';
    const fontSize = 44;
    const fontSizeTitle = 24;

    for (const song of songsData) {
        if (!song.lyrics || song.lyrics.length === 0) {
            continue; // If there are no lyrics, skip the song
        }

        // --- Title Slide ---
        const titleSlide = pres.addSlide();
        titleSlide.background = { color: '000000' };
        titleSlide.addText(song.title, {
            x: 0,
            y: 0,
            w: '100%',
            h: '100%',
            align: 'center',
            valign: 'middle',
            fontFace: fontName,
            fontSize: 60,
            color: 'FFFFFF',
            bold: true,
        });

        // --- Lyrics Slides ---
        for (let i = 0; i < song.lyrics.length; i += linesPerSlide) {
            const slide = pres.addSlide();
            slide.background = { color: '000000' };

            const lyricsChunk = song.lyrics.slice(i, i + linesPerSlide);
            const lyricsText = lyricsChunk.join('\n');

            // Lyrics content
            slide.addText(lyricsText, {
                x: 0.5,
                y: 0.25,
                w: '95%',
                h: '85%',
                align: 'center',
                valign: 'top',
                fontFace: fontName,
                fontSize: fontSize,
                color: 'FFFF00',
                bold: true,
                lineSpacing: 50
            });

            // Footer with song title
            slide.addText(song.title, {
                x: 0,
                y: '90%',
                w: '100%',
                h: '10%',
                align: 'center',
                valign: 'middle',
                fontFace: fontName,
                fontSize: fontSizeTitle,
                color: 'FFFF00',
            });
        }
    }

    await pres.writeFile({ fileName: outputPath });
    generatorLogger.info(`--- 投影用 PPT 已成功儲存至 '${outputPath}' ---`);
}

export async function generateFiles(songOrder: string[]): Promise<string> {
    const PROJECT_ROOT = path.join(__dirname, '..', '..');
    const PPT_LIBRARY_PATH = path.join(PROJECT_ROOT, "resources", "ppt_library", "2025 別是巴聖教會雲端詩歌PPT修");
    const TEMPLATE_DOCX_PATH = path.join(PROJECT_ROOT, "resources", "template.docx");
    const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const outputDocxPath = path.join(OUTPUT_DIR, "敬拜大字報.docx");
    const outputPptxPath = path.join(OUTPUT_DIR, "敬拜PPT.pptx");
    const zipPath = path.join(OUTPUT_DIR, "presentation_files.zip");

    // --- Generate Files ---
    const songsData = await extractSongData(songOrder, PPT_LIBRARY_PATH);
    await generateWordDocument(songsData, TEMPLATE_DOCX_PATH, outputDocxPath);
    await generateProjectionPpt(songsData, outputPptxPath, 2);

    // --- Zip Files ---
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            generatorLogger.info(archive.pointer() + ' total bytes');
            generatorLogger.info('archiver has been finalized and the output file descriptor has closed.');
            resolve(zipPath);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.file(outputDocxPath, { name: '敬拜大字報.docx' });
        archive.file(outputPptxPath, { name: '敬拜PPT.pptx' });
        archive.finalize();
    });
}
