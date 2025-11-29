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

---

## 產品開發流程 (Web Application Development Roadmap)

為了將此專案擴展為一個功能完整的網站，建議採用前後端分離的架構。以下是建議的開發流程：

### 第一階段：後端 API 開發 (使用 Node.js & Express.js & MongoDB)

後端的職責是處理核心邏輯：管理詩歌資料、提供搜尋功能、以及生成最終的 PPT 和 Word 檔案。

  - [x] 1.  **資料庫建立與初始化 (MongoDB):**
    - [x] 在本地端或 NAS 的 Docker 中啟動 MongoDB。
    - [x] 讀取 `2025別是巴修正詩歌清單.xlsx` 檔案，並將詩歌資訊匯入到 MongoDB 資料庫的 `songs` collection 中。
    - [x] 建立一個腳本 (`backend/src/import-db.ts`)，以便在需要時重新匯入資料。

  - [x] 2.  **建立 Web API 框架 (Node.js & Express.js):**
    - [x] 初始化 Node.js 專案，設定 TypeScript 環境。
    - [x] 使用 Express.js 建立一個輕量級的 Web 服務。
    - [x] 安裝必要的 Node.js 依賴套件 (Express, MongoDB driver, TypeScript 相關工具)。

  - [x] 3.  **開發 API 端點 (Endpoints):**
    - [x] **`GET /api/songs`**: 提供詩歌搜尋功能。
        *   [x] 允許通過詩歌編號、名稱（支援模糊搜尋）等參數進行查詢。
        *   [x] 從 MongoDB 中獲取資料並返回 JSON 列表。
    - [x] **`POST /api/generate`**: 接收前端發來的詩歌列表，並生成檔案。
        *   [x] 接收一個包含使用者選擇的歌曲名稱列表的請求。
        *   [x] Node.js 後端呼叫 Python 腳本 (`python-backend-legacy/generate_wrapper.py`) 來執行核心的 PPT/Word 生成邏輯。
        *   [x] 將生成的 Word 和 PPT 文件打包成 ZIP 檔案，並作為回應供前端下載。

  - [x] 4.  **整合 Python 核心邏輯:**
    - [x] 將原有的 `Auto_ppt_word.py` 拆分為 `python-backend-legacy/logic.py` (核心邏輯模組) 和 `python-backend-legacy/generate_wrapper.py` (供 Node.js 調用的包裝腳本)。
    - [x] `generate_wrapper.py` 負責接收 Node.js 傳來的參數，呼叫 `logic.py` 中的生成函數，並返回結果。

### 第二階段：前端介面開發 (使用 React & Vite)

前端負責提供使用者互動的介面，讓使用者可以輕鬆地搜尋、選擇詩歌並觸發檔案生成。

  - [ ] 1.  **專案初始化:**
    - [ ] 使用 Vite 初始化一個新的 React 專案（推薦使用 TypeScript 模板以提高程式碼品質）。

  - [ ] 2.  **UI/UX 設計與組件開發:**
    - [ ] **主頁面佈局**: 設計一個包含搜尋框、搜尋結果列表、已選詩歌列表和生成按鈕的介面。
    - [ ] **`SongItem` 組件**: 用於顯示單一詩歌的資訊（編號、歌名），並提供一個 "加入" 按鈕。
    - [ ] **`SelectedList` 組件**: 顯示使用者已經選擇的詩歌，並允許調整順序或移除。

  - [ ] 3.  **狀態管理與 API 整合:**
    - [ ] 使用 React Hooks (如 `useState`, `useEffect`) 或狀態管理工具 (如 Zustand) 來管理搜尋關鍵字、搜尋結果、已選詩歌列表等狀態。
    - [ ] 當使用者在搜尋框輸入時，調用後端的 `GET /api/songs` API 來獲取並顯示結果。
    - [ ] 當使用者點擊 "生成 PPT/Word" 按鈕時，將已選詩歌列表的 ID 發送到後端的 `POST /api/generate` API。
    *   [ ] 處理 API 回應，觸發瀏覽器下載後端生成好的檔案。

  - [ ] 4.  **使用者體驗優化:**
    - [ ] 在 API 請求期間顯示讀取中 (Loading) 的指示。
    - [ ] 處理 API 錯誤，並向使用者顯示友善的錯誤訊息。
    *   [ ] 美化介面樣式，可以使用 CSS 框架如 Tailwind CSS 或 Material-UI。

### 第三階段：整合與部署

1.  **CORS 設定**: 在後端 FastAPI 中設定 CORS (跨來源資源共用)，允許前端（來自不同源）的請求。
2.  **環境變數**: 將設定（如資料庫路徑、模板檔案路徑）寫入 `.env` 檔案，方便管理。
3.  **撰寫部署文檔**:
    *   提供如何分別啟動後端服務和前端開發伺服器的說明。
    *   提供如何將專案打包並部署到伺服器的指南（例如使用 Docker 容器化）。