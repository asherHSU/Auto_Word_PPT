# 使用 Node.js 18 Alpine 作為基底 (輕量、安全)
FROM node:18-alpine

# 1. 安裝 Python 3, pip 和建置工具
# --no-cache 避免暫存檔佔用空間
# build-base 用於編譯某些可能需要的原生模組
RUN apk add --no-cache python3 py3-pip build-base

# 設定工作目錄
WORKDIR /app

# 2. 先複製 Python 依賴並安裝 (利用 Docker Cache 機制)
COPY requirements.txt .
# --break-system-packages 是因為 Alpine 新版 Python 安全策略，在容器內我們可以直接安裝
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 3. 複製 Node.js 依賴並安裝
COPY package.json package-lock.json* ./
RUN npm ci

# 4. 複製剩餘的所有程式碼 (包含 src, scripts, tsconfig.json 等)
COPY . .

# 5. 編譯 TypeScript 到 JavaScript
RUN npm run build

# 建立資源與輸出目錄 (確保權限正確)
RUN mkdir -p resources/ppt_library output

# 暴露 Port
EXPOSE 3000

# 啟動指令 (指向編譯後的 dist/index.js)
CMD ["node", "dist/index.js"]