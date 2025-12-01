import sys
import json
import os
import re
# 引入 docx 和 pptx 相關套件
try:
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from pptx import Presentation
    from pptx.util import Inches, Pt as PptPt
    from pptx.dml.color import RGBColor as PptRGBColor
    from pptx.enum.text import PP_ALIGN
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {e}"}))
    sys.exit(1)

import io
# 設定標準輸出為 UTF-8，避免中文亂碼
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# --- 參數解析 ---
# argv[1]: 模式 ("preview" or "generate")
# argv[2]: 歌單 JSON 字串
# argv[3]: 資源目錄
# argv[4]: 輸出目錄 (僅 generate 模式需要)

try:
    MODE = sys.argv[1]
    songs_input = json.loads(sys.argv[2])
    RESOURCES_DIR = sys.argv[3]
    OUTPUT_DIR = sys.argv[4] if len(sys.argv) > 4 else None
except IndexError:
    print(json.dumps({"error": "Missing arguments"}))
    sys.exit(1)

PPT_LIBRARY_PATH = os.path.join(RESOURCES_DIR, "ppt_library")
TEMPLATE_PATH = os.path.join(RESOURCES_DIR, "template.docx")

# --- 輔助函式 ---
def clean_text(text):
    return re.sub(r'[\x00-\x08\x0e-\x1f]', '', text)

def normalize_string(s):
    return re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', s).lower()

def find_ppt_path(root_path, song_id, song_name):
    if not os.path.exists(root_path): return None
    target_name = normalize_string(song_name)
    # 支援 id 為字串或數字
    id_str = str(song_id)
    id_regex = re.compile(rf"^0*{id_str}([^0-9]|$)")

    for dirpath, _, filenames in os.walk(root_path):
        for filename in filenames:
            if not filename.lower().endswith(('.pptx', '.ppt')): continue
            name_stem = os.path.splitext(filename)[0]
            if id_regex.match(name_stem): return os.path.join(dirpath, filename)
            if target_name in normalize_string(name_stem): return os.path.join(dirpath, filename)
    return None

def extract_lyrics_from_ppt(ppt_path):
    """
    Extracts lyrics from a PPTX file, preserving the slide structure.
    Returns a list of lists, where each inner list represents the lines on a slide.
    """
    if not ppt_path or not ppt_path.lower().endswith(".pptx"): return []
    try:
        prs = Presentation(ppt_path)
        slides_lyrics = []
        for slide in prs.slides:
            slide_lines = []
            for shape in slide.shapes:
                if not shape.has_text_frame or not shape.text.strip(): continue
                if shape.top < prs.slide_height / 2:
                    text = shape.text_frame.text.replace('\v', '\n')
                    for line in text.splitlines():
                        if line.strip():
                            cleaned_line = re.sub(r'[ \t]+', ' ', clean_text(line))
                            slide_lines.append(cleaned_line)
            if slide_lines:
                slides_lyrics.append(slide_lines)
        return slides_lyrics
    except:
        return []

def apply_font_settings(paragraph, font_name, font_size, font_color, is_bold=False):
    for run in paragraph.runs:
        run.font.name = font_name
        run.font.size = PptPt(font_size)
        run.font.color.rgb = font_color
        run.font.bold = is_bold

# --- 主邏輯 ---

if MODE == "preview":
    # 預覽模式：回傳 [{title, lyrics}, ...] JSON
    results = []
    for song in songs_input:
        song_id = song.get('id', 0)
        song_name = song.get('name', '') or song.get('title', '')
        
        ppt_path = find_ppt_path(PPT_LIBRARY_PATH, song_id, song_name)
        # lyrics_by_slide is a list of lists
        lyrics_by_slide = extract_lyrics_from_ppt(ppt_path)
        # Flatten the list for preview compatibility
        flat_lyrics = [line for slide in lyrics_by_slide for line in slide]
        
        results.append({
            "title": song_name,
            "lyrics": flat_lyrics,
            "found": bool(ppt_path),
            "isOld": ppt_path.endswith(".ppt") if ppt_path else False
        })
    
    # 直接輸出 JSON 到 stdout 供 Node.js 讀取
    print(json.dumps(results, ensure_ascii=False))

elif MODE == "generate":
    # 生成模式：建立 Word/PPT
    if not OUTPUT_DIR:
        print(json.dumps({"error": "Output directory required"}))
        sys.exit(1)

    OUTPUT_DOCX = os.path.join(OUTPUT_DIR, "敬拜大字報.docx")
    OUTPUT_PPTX = os.path.join(OUTPUT_DIR, "敬拜PPT.pptx")

    # 1. Word
    try:
        doc = Document(TEMPLATE_PATH)
        # 移除範本中可能存在的第一個空段落
        if doc.paragraphs and not doc.paragraphs[0].text.strip():
            p_element = doc.paragraphs[0]._element
            p_element.getparent().remove(p_element)
    except:
        doc = Document() # Fallback

    # 2. PPT
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625)
    BLACK_FILL = PptRGBColor(0, 0, 0)
    YELLOW_TEXT = PptRGBColor(255, 255, 0)
    FONT_NAME = "微軟正黑體"

    # 處理資料
    for i, song in enumerate(songs_input):
        title = song.get('title') or song.get('name')
        
        is_from_preview = 'lyrics' in song and song['lyrics'] is not None
        
        lyrics_data = []
        if is_from_preview:
            lyrics_data = [re.sub(r'[ \t]+', ' ', line) for line in song['lyrics']]
        else:
            sid = song.get('id', 0)
            path = find_ppt_path(PPT_LIBRARY_PATH, sid, title)
            lyrics_data = extract_lyrics_from_ppt(path)

        # --- 生成 Word ---
        # Word generation always needs a flat list of lyrics
        flat_lyrics = []
        if is_from_preview:
            flat_lyrics = lyrics_data
        else: # It's a list of lists, flatten it
            flat_lyrics = [line for slide in lyrics_data for line in slide]

        if i > 0:
            doc.add_paragraph("")

        doc.add_paragraph(f"【{title}】", style='SongTitle' if 'SongTitle' in doc.styles else None)
        
        if not flat_lyrics:
            p = doc.add_paragraph()
            run = p.add_run("【無歌詞內容】")
            run.font.color.rgb = RGBColor(0, 0, 0) # Changed to black
        else:
            for line in flat_lyrics:
                p = doc.add_paragraph(line, style='Lyrics' if 'Lyrics' in doc.styles else None)
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                
                if line.strip().lower().startswith(('c.', 'b.')):
                    for run in p.runs:
                        run.font.bold = True
                        # run.font.color.rgb = RGBColor(255, 0, 0) # Removed red color setting
        
        # --- 生成 PPT ---
        if not lyrics_data: continue
        
        layout = prs.slide_layouts[6] 

        if is_from_preview:
            # Logic for flat list from preview
            for i in range(0, len(lyrics_data), 2):
                slide = prs.slides.add_slide(layout)
                slide.background.fill.solid()
                slide.background.fill.fore_color.rgb = BLACK_FILL

                line1 = lyrics_data[i]
                lyric_text = line1
                if i + 1 < len(lyrics_data):
                    lyric_text += f"\n{lyrics_data[i+1]}"

                tb_lyrics = slide.shapes.add_textbox(Inches(0.5), Inches(0.1), Inches(9), Inches(2.5))
                tf_lyrics = tb_lyrics.text_frame
                p_lyrics = tf_lyrics.paragraphs[0]
                p_lyrics.text = lyric_text
                p_lyrics.alignment = PP_ALIGN.CENTER
                apply_font_settings(p_lyrics, FONT_NAME, 32, YELLOW_TEXT, True)

                tb_title = slide.shapes.add_textbox(Inches(0.5), Inches(5.1), Inches(9), Inches(0.5))
                tf_title = tb_title.text_frame
                p_title = tf_title.paragraphs[0]
                p_title.text = f"《{title}》"
                p_title.alignment = PP_ALIGN.CENTER
                apply_font_settings(p_title, FONT_NAME, 20, YELLOW_TEXT, False)
        else:
            # Logic for list of lists from direct extraction
            for slide_lines in lyrics_data:
                slide = prs.slides.add_slide(layout)
                slide.background.fill.solid()
                slide.background.fill.fore_color.rgb = BLACK_FILL

                num_lines = len(slide_lines)
                font_size = 32
                if num_lines == 3:
                    font_size = 28
                elif num_lines >= 4:
                    font_size = 24
                
                lyric_text = "\n".join(slide_lines)

                tb_lyrics = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(2.5))
                tf_lyrics = tb_lyrics.text_frame
                p_lyrics = tf_lyrics.paragraphs[0]
                p_lyrics.text = lyric_text
                p_lyrics.alignment = PP_ALIGN.CENTER
                apply_font_settings(p_lyrics, FONT_NAME, font_size, YELLOW_TEXT, True)

                tb_title = slide.shapes.add_textbox(Inches(0.5), Inches(5.1), Inches(9), Inches(0.5))
                tf_title = tb_title.text_frame
                p_title = tf_title.paragraphs[0]
                p_title.text = f"《{title}》"
                p_title.alignment = PP_ALIGN.CENTER
                apply_font_settings(p_title, FONT_NAME, 20, YELLOW_TEXT, False)

    doc.save(OUTPUT_DOCX)
    prs.save(OUTPUT_PPTX)
    print(json.dumps({"status": "success", "files": [OUTPUT_DOCX, OUTPUT_PPTX]}))

else:
    print(json.dumps({"error": "Unknown mode"}))