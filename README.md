# Auto Word PPT

### ⚙️ 首次設定：前置作業 (只需做一次)

在開始享受一鍵生成的便利之前，需要先為專案打好基礎。這些步驟通常只需要設定一次。

1.  **安裝執行環境 (Installation)**

      * **安裝 Python**：確保電腦已安裝 Python 3.6 或更高版本。
      * **安裝依賴套件**：打開終端機 (Terminal/CMD)，進入專案資料夾，執行以下指令，安裝所有必要的 Python 函式庫：
        ```bash
        pip install -r requirements.txt
        ```

2.  **整理詩歌庫 (Organize PPT Library)**

      * 建立一個主資料夾來存放你所有的詩歌 PPT 檔案 (例如：`D:\Desktop\church\Auto_ppt_word\2025 別是巴聖教會雲端詩歌PPT`)。

3.  **設計 Word 範本 (Create `template.docx`)**

      * 這是決定最終 Word 文件外觀的**最重要步驟**。
      * 打開一個新的 Word 文件，建立並設計好你需要的樣式，特別是：
          * `SongTitle`：詩歌標題樣式。
          * `Lyrics`：歌詞內文樣式。
      * 將此檔案儲存為 `template.docx`，並放置在與 `Auto_ppt_word.py` 同一個資料夾下。

-----

### 🚀 每週執行：常規流程 (Recurring Workflow)

完成首次設定後，每週製作大字報就只需要遵循以下簡單流程：

1.  **更新當週歌單 (Update `song_order`)**

      * 打開主程式 `Auto_ppt_word.py`。
      * 找到 `song_order = [...]` 這一行，將方括號中的歌名替換成當週要使用的詩歌，**注意順序即為產出的順序**。
        ```python
        # 範例：
        song_order = [
            "將天敞開",
            "在這裡",
            "我們的神",
            "耶穌永遠掌權"
        ]
        ```

2.  **確認輸出檔名 (Confirm Output Filename)**

      * 在同一個檔案中，你可以視需要修改 `output_filename`和 `output_path` 變數：
        ```python
        # 範例：
        output_filename = "D:/Desktop/church/Auto_ppt_word/敬拜大字報.docx"
        output_path = "D:/Desktop/church/Auto_ppt_word/敬拜PPT.pptx"
        ```

3.  **執行主程式 (Run the Script)**

      * 打開終端機，進入專案資料夾，並執行：
        ```bash
        python Auto_ppt_word.py
        ```

4.  **檢查產出 (Check the Output)**

      * 程式執行完畢後，會在專案資料夾下生成你指定的 Word 檔案。打開檢查格式與內容是否正確即可。

-----

### 💡 其他重要需知 (Important Information)

1.  **歌名必須完全匹配**：`song_order` 清單中的歌名，必須與 PPT 檔名中提取出來的標題**一字不差**，否則程式會報告「找不到檔案」。例如，「祢的靈」和「你的靈」是不同的。

2.  **格式調整請修改 `template.docx`**：未來若想調整歌詞的字體大小、行距或顏色，**請直接修改 `template.docx` 檔案中的樣式**，而不是去改 Python 程式碼。這是使用範本最大的好處。

3.  **新增詩歌**：當你有新的詩歌要加入詩歌庫時，請務必：

      * 儲存為 `.pptx` 格式。
      * 遵循既有的命名規則（`編號-歌名.pptx`）。
      * 放入對應的子資料夾中。

