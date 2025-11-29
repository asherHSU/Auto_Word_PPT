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
exports.findPptPath = findPptPath;
exports.extractSongData = extractSongData;
exports.generateWordDocument = generateWordDocument;
exports.generateProjectionPpt = generateProjectionPpt;
exports.generateFiles = generateFiles;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const docx_1 = require("docx");
const pptxgenjs_1 = __importDefault(require("pptxgenjs"));
const archiver_1 = __importDefault(require("archiver"));
const textract_1 = __importDefault(require("textract"));
// --- Core Functions ---
async function findPptPath(rootPath, songTitle) {
    const files = fs.readdirSync(rootPath);
    for (const file of files) {
        const filePath = path.join(rootPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const result = await findPptPath(filePath, songTitle);
            if (result) {
                return result;
            }
        }
        else if (stat.isFile()) {
            const fileName = path.basename(filePath, path.extname(filePath));
            // From the python code:
            // # 從檔名中分離出真正的歌曲標題 (支援 '-' 或 ' ' 分隔)
            // title_from_file = ""
            // if '-' in name_stem:
            //     title_from_file = name_stem.split('-', 1)[-1].strip()
            // elif ' ' in name_stem:
            //     title_from_file = name_stem.split(' ', 1)[-1].strip()
            // else:
            //     title_from_file = name_stem.strip()
            const titleFromFile = fileName.includes('-')
                ? fileName.split('-').slice(1).join('-').trim()
                : fileName.includes(' ')
                    ? fileName.split(' ').slice(1).join(' ').trim()
                    : fileName.trim();
            if (titleFromFile.toLowerCase() === songTitle.toLowerCase()) {
                return filePath;
            }
        }
    }
    return null;
}
function cleanText(text) {
    // Removes incompatible XML control characters but keeps newline, carriage return, and tab
    return text.replace(/[\x00-\x08\x0e-\x1f]/g, '');
}
async function extractSongData(songOrder, pptLibraryPath) {
    console.log("--- 階段一：提取歌詞資料 ---");
    const songsData = [];
    for (const songTitle of songOrder) {
        console.log(`正在處理歌曲: ${songTitle}...`);
        const pptPath = await findPptPath(pptLibraryPath, songTitle);
        const songInfo = { title: songTitle, lyrics: [], isPptOldFormat: false, found: false };
        if (!pptPath) {
            console.log(`  > 警告: 在資料庫中找不到 '${songTitle}' 的檔案。`);
            songsData.push(songInfo);
            continue;
        }
        songInfo.found = true;
        if (pptPath.toLowerCase().endsWith(".ppt")) {
            console.log(`  > 警告: '${songTitle}' 是舊版 .ppt 格式，無法自動提取歌詞。`);
            songInfo.isPptOldFormat = true;
            songsData.push(songInfo);
            continue;
        }
        console.log(`  > 找到了: ${path.basename(pptPath)}`);
        try {
            const text = await new Promise((resolve, reject) => {
                textract_1.default.fromFileWithPath(pptPath, (err, text) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(text);
                });
            });
            const lines = text.split('\n').map(line => cleanText(line.trim())).filter(line => line);
            songInfo.lyrics = lines;
        }
        catch (error) {
            console.error(`  > 錯誤: 無法從 '${songTitle}' 提取文字:`, error);
        }
        songsData.push(songInfo);
    }
    console.log("--- 歌詞資料提取完成 ---");
    return songsData;
}
async function generateWordDocument(songsData, templatePath, outputPath) {
    console.log("--- 階段二：生成 Word 大字報 ---");
    const sections = [];
    for (const song of songsData) {
        const children = [
            new docx_1.Paragraph({
                text: `【${song.title}】`,
                style: "SongTitle",
            }),
        ];
        if (!song.lyrics || song.lyrics.length === 0) {
            let warningText = "";
            if (!song.found) {
                warningText = "【警告：在詩歌庫中找不到這首歌的檔案，請檢查歌名是否完全匹配】";
            }
            else if (song.isPptOldFormat) {
                warningText = "【注意：此歌曲為舊版.ppt格式，無法自動匯入，請手動處理】";
            }
            else {
                warningText = "【注意：找到了檔案，但未能成功提取任何歌詞】";
            }
            children.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: warningText,
                        bold: true,
                    }),
                ],
            }), new docx_1.Paragraph(""));
        }
        else {
            for (const line of song.lyrics) {
                children.push(new docx_1.Paragraph({
                    text: line,
                    style: "Lyrics",
                }));
            }
            children.push(new docx_1.Paragraph("")); // Add an empty paragraph for spacing
        }
        sections.push({ properties: { type: docx_1.SectionType.NEXT_PAGE }, children: children });
    }
    const doc = new docx_1.Document({
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
    const buffer = await docx_1.Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    console.log(`--- Word 大字報已成功儲存至 '${outputPath}' ---`);
}
async function generateProjectionPpt(songsData, outputPath, linesPerSlide = 4) {
    console.log("--- 階段三：生成投影用 PPT ---");
    const pres = new pptxgenjs_1.default();
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
    console.log(`--- 投影用 PPT 已成功儲存至 '${outputPath}' ---`);
}
async function generateFiles(songOrder) {
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
    const archive = (0, archiver_1.default)('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });
    return new Promise((resolve, reject) => {
        output.on('close', () => {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
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
