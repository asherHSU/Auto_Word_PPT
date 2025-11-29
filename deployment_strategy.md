# 部署策略建議

## 基本部署策略 (基於 Docker Compose)

考量到您已有的 Docker Compose 設定，最直接且有效的方式是將整個應用程式堆疊部署到一個虛擬私人伺服器 (VPS) 或雲端虛擬機 (VM) 上。

### 推薦步驟：

1.  **Provision Linux VPS/VM**:
    *   選擇一個您偏好的雲端服務提供商 (例如 AWS EC2, Google Compute Engine, DigitalOcean, Linode)。
    *   建立一個新的 Linux 虛擬機實例 (建議 Ubuntu 或 Debian 發行版)。
    *   確保該 VM 具有足夠的 CPU、記憶體和儲存空間來運行您的應用程式堆疊。

2.  **安裝 Docker 和 Docker Compose**:
    *   SSH 連線到您的 VM。
    *   按照 Docker 官方文件安裝 Docker Engine 和 Docker Compose。
    *   通常，這只需要幾個命令即可完成：
        ```bash
        sudo apt-get update
        sudo apt-get install ca-certificates curl gnupg
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          \"$(. /etc/os-release && echo \"$VERSION_CODENAME\")\" stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ```
        (請注意，上述命令適用於 Ubuntu，其他發行版可能略有不同)

3.  **傳輸應用程式檔案**:
    *   將您的整個專案目錄 (包括 `docker-compose.yml`, `backend/`, `frontend/`, `.env.example` 等所有檔案) 傳輸到 VM 上。
    *   您可以使用 `scp` 命令、`git clone` 或其他檔案傳輸工具。例如：
        ```bash
        scp -r /path/to/your/local/project_folder user@your_server_ip:/path/to/remote/location
        ```

4.  **配置環境變數 (.env 檔案)**:
    *   在 VM 上，進入您的專案根目錄。
    *   基於您本機的 `.env.example` 檔案，創建一個實際的 `.env` 檔案 (`cp .env.example .env`)。
    *   **編輯 `.env` 檔案**：
        *   `MONGO_URI=mongodb://mongo:27017` (如果 MongoDB 是 Docker Compose 堆疊的一部分，這個通常不需要更改)
        *   `JWT_SECRET=您的生產環境專用且足夠強大的密鑰` (**非常重要**：請替換為一個長且複雜的隨機字串，不要使用 `supersecretjwtkey`)
        *   `VITE_API_URL=http://your_server_ip:3000` (如果前端透過 Nginx 反向代理，則應指向 Nginx 的內部服務名稱或 IP，或者直接指向後端服務的 URL。在沒有 Nginx 的簡單情況下，可以是 `http://your_server_ip:3000` 或 `http://backend:3000` 如果前端和後端位於同一個 Docker 網路。)

5.  **運行 Docker Compose 服務**:
    *   在專案根目錄下執行：
        ```bash
        docker-compose up -d --build
        ```
    *   這將會在背景啟動所有服務 (`-d` 參數)，並建置 (或重新建置) 映像檔 (`--build` 參數)。

6.  **配置 Nginx 反向代理 (選擇性但強烈推薦用於生產環境)**:
    *   為了更好的性能、安全性 (SSL/TLS) 和域名管理，建議在 Docker Compose 堆疊之外設置一個專門的 Nginx 伺服器作為反向代理。
    *   Nginx 將負責處理所有進來的 HTTP/HTTPS 請求，並將它們轉發到 Docker Compose 堆疊中的前端和後端服務。
    *   這也方便您配置 SSL 憑證 (例如使用 Certbot 自動獲取 Let's Encrypt 憑證)。

### 服務訪問：
*   **前端應用程式**: 如果沒有 Nginx，則透過 `http://your_server_ip:5173` 訪問。如果配置了 Nginx 和域名，則透過您的域名訪問 (例如 `https://yourdomain.com`)。
*   **後端 API**: 如果沒有 Nginx，則透過 `http://your_server_ip:3000` 訪問。通常，後端 API 不會直接對外暴露，而是透過前端或另一個 API Gateway 訪問。

這個策略提供了一個基於 Docker 的可擴展和相對簡單的部署解決方案。請根據您的具體需求和雲端服務提供商的偏好進行調整。
