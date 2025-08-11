import os
import re
from docx import Document
# ▼▼▼ 匯入調整格式需要的新工具 ▼▼▼
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
# ▲▲▲ 匯入結束 ▲▲▲
from pptx import Presentation

# --- 使用者設定區 ---
song_order = [
    "將天敞開",
    "在這裡",
    "我們的神",
    "耶穌永遠掌權",
    "禱告的力量"
]
ppt_library_path = "D:/Desktop/church/Auto_ppt_word/2024 別是巴聖教會雲端詩歌PPT" # 我根據你的截圖更新了路徑
output_filename = "敬拜大字報.docx"

# --- 程式準備區 ---
# ▼▼▼ 修改：不再建立全新文件，而是從我們的範本載入 ▼▼▼
try:
    document = Document("template.docx")
except Exception as e:
    print("錯誤：找不到 'template.docx' 範本檔案，請確認它與Python腳本放在同一個資料夾。")
    print(f"詳細錯誤：{e}")
    exit()
# ▲▲▲ 修改結束 ▲▲▲

# --- 核心功能函式 ---
# --- 核心功能函式 ---
def find_ppt_path(root_path, song_title):
    for dirpath, _, filenames in os.walk(root_path):
        for filename in filenames:
            if (filename.endswith(".pptx") or filename.endswith(".ppt")) and song_title in filename:
                return os.path.join(dirpath, filename)
    return None

# ▼▼▼ 修正一：修正 clean_text 的過濾規則，不再移除換行符號 ▼▼▼
def clean_text(text):
    """
    清除文字中不相容XML的控制字元，但保留換行、歸位和定位符。
    """
    # 這個規則移除了大部分控制字元，但會保留 \t, \n, \r, \v
    return re.sub(r'[\x00-\x08\x0e-\x1f]', '', text)
# ▲▲▲ 修正結束 ▲▲▲

# --- 程式主體 ---
print("程式已啟動，準備開始處理...")
for song in song_order:
    print(f"正在處理歌曲: {song}...")
    ppt_path = find_ppt_path(ppt_library_path, song)
    
    if ppt_path:
        print(f"  > 找到了: {os.path.basename(ppt_path)}")
        
        if ppt_path.endswith(".ppt"):
            # ... (跳過 .ppt 的邏輯維持不變)
            document.add_heading(f"【{song}】", level=1)
            p = document.add_paragraph()
            p.add_run("【此歌曲為舊版.ppt格式，無法自動匯入，請手動處理】").bold = True
            document.add_paragraph("")
            continue

        document.add_paragraph(f"【{song}】", style='SongTitle')
        
        prs = Presentation(ppt_path)
        
        for slide in prs.slides:
            for shape in slide.shapes:
                if not shape.has_text_frame or not shape.text.strip():
                    continue

                if shape.top < prs.slide_height / 2:
                    # ▼▼▼ 修正二：簡化並統一處理所有換行 ▼▼▼
                    
                    # 1. 取得文字框的完整文字，包含所有 \n 和 \v 換行符
                    raw_text = shape.text_frame.text
                    
                    # 2. 將軟換行(\v)統一替換成標準換行(\n)
                    text_with_standard_breaks = raw_text.replace('\v', '\n')
                    
                    # 3. 使用 splitlines() 這個強大的方法來切割所有行
                    lines = text_with_standard_breaks.splitlines()

                    # 4. 遍歷所有切割出來的行
                    for line in lines:
                        if not line.strip():
                            continue
                        
                        # 清洗每一行文字
                        lyric_text = clean_text(line)
                        
                        # 為每一行歌詞建立一個新的Word段落
                        p = document.add_paragraph(lyric_text, style='Lyrics')
                        
                        # 樣式微調邏輯 (例如標示副歌)
                        if lyric_text.strip().startswith(('c.', 'b.')):
                            if p.runs:
                                run = p.runs[0]
                                run.font.bold = True
                                run.font.color.rgb = RGBColor(255, 0, 0)
                    # ▲▲▲ 修改結束 ▲▲▲
        
    else:
        print(f"  > 警告: 在 '{ppt_library_path}' 中找不到歌曲 '{song}' 的PPT檔案。")

# --- 程式結束區 ---
document.save(output_filename)
print("--------------------")
print(f"處理完成！檔案 '{output_filename}' 已成功建立！")