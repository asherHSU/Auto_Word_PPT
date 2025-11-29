# 後端功能驗證步驟

好的，我將提議驗證後端的新實作功能。

首先，我們需要測試身份驗證相關的端點 (`/api/register` 和 `/api/login`)，以獲取一個 JWT token。
然後，我們將使用這個 token 來測試受保護的 `/api/generate` 端點以及歌曲的 CRUD 操作。

請您按照以下步驟進行測試：

### 步驟 1: 啟動後端伺服器
請確保後端伺服器已啟動。在專案的根目錄下，執行以下命令 (如果尚未啟動):
```bash
npm start --prefix backend
```

### 步驟 2: 註冊一個新用戶
開啟一個新的終端機視窗，執行以下命令來註冊一個新用戶。請替換 `your_username` 和 `your_password` 為您想使用的帳號和密碼：
```bash
curl -X POST http://localhost:3000/api/register \
     -H "Content-Type: application/json" \
     -d '{"username": "your_username", "password": "your_password"}'
```
您應該會收到一個成功的響應，例如 `{"message":"User registered successfully.","userId":"..."}`

### 步驟 3: 登入並獲取 JWT Token
使用您剛才註冊的用戶名和密碼登入，獲取一個 JWT token。請替換 `your_username` 和 `your_password`：
```bash
curl -X POST http://localhost:3000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username": "your_username", "password": "your_password"}'
```
您應該會收到一個包含 token 的響應，例如 `{"token":"eyJhbGciOiJIUzI1Ni..."}`。請複製這個 token，因為接下來會用到。

### 步驟 4: 測試檔案生成功能 (`/api/generate`)
現在，使用您獲取的 JWT token 來測試檔案生成功能。請將 `<YOUR_JWT_TOKEN>` 替換為您上一步獲得的實際 token，並確保在 `songs` 陣列中提供有效的歌曲名稱 (例如："讚美之泉", "耶穌我愛祢", "祢真偉大")：
```bash
curl -X POST http://localhost:3000/api/generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
     -d '{"songs": ["讚美之泉", "耶穌我愛祢", "祢真偉大"]}' \
     --output generated_files.zip
```
這應該會下載一個 `generated_files.zip` 檔案。請檢查這個 zip 檔案的內容是否正確生成了 Word 和 PPT 文件。

### 步驟 5: 測試歌曲 CRUD 端點 (可選)
您也可以測試歌曲的增刪改查端點：
- **新增歌曲**: `POST /api/songs` (需要 JWT token)
- **查詢歌曲**: `GET /api/songs` (不需要 JWT token)
- **更新歌曲**: `PUT /api/songs/:id` (需要 JWT token)
- **刪除歌曲**: `DELETE /api/songs/:id` (需要 JWT token)

請您執行這些測試步驟後，告訴我結果。我將根據您的回饋決定下一步行動。
