# 使用 Node.js 18 Alpine 作為基底 (輕量、安全)
FROM node:18-alpine

# 1. 安裝 Python 3, pip 和建置工具
# ⚠️ 關鍵修正：新增 libxml2-dev, libxslt-dev, python3-dev
# 這是 python-pptx 在 Alpine Linux 上能夠正確提取文字所必需的依賴
RUN apk add --no-cache python3 py3-pip build-base python3-dev libxml2-dev libxslt-dev

# 設定工作目錄
WORKDIR /app

# 2. 先複製 Python 依賴並安裝 (利用 Docker Cache 機制)
COPY requirements.txt .
# --break-system-packages 是因為 Alpine 新版 Python 安全策略
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