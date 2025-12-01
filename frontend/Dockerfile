# --- Stage 1: Build ---
FROM node:18-alpine as build

WORKDIR /app

# 安裝依賴
COPY package.json package-lock.json* ./
RUN npm ci

# 複製程式碼
COPY . .

# 設定環境變數為空 (強制使用相對路徑，走 Nginx Proxy)
ENV VITE_API_URL=""

# 執行 Vite Build
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:alpine

# 複製 Stage 1 打包好的 dist 資料夾到 Nginx 目錄
COPY --from=build /app/dist /usr/share/nginx/html

# 複製我們自定義的 Nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]