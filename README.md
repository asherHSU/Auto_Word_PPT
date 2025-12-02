# Auto PPT Word Generation Project

This project automates the generation of worship presentation files (Word for large print, PowerPoint for projection) based on a list of song titles. It has been evolved into a full-stack web application with a Node.js/TypeScript backend (Express.js, MongoDB), a React/TypeScript frontend (Vite), and is fully containerized with Docker Compose.

## 🚀 Features

*   **Song Database**: Stores song information (ID, Name).
*   **Song Search**: Search songs by ID or name.
*   **Song Management (CRUD)**: Add, edit, and delete songs (authenticated).
*   **Automated File Generation**: Generates Word documents (large print) and PowerPoint presentations (projection) from a list of selected songs.
*   **Authentication**: User registration and login with JWT-based authentication.
*   **Containerized Deployment**: Easy setup and deployment using Docker and Docker Compose.

## ⚙️ Technologies Used

### Backend
*   **Node.js**: JavaScript runtime.
*   **TypeScript**: Statically typed superset of JavaScript.
*   **Express.js**: Web application framework.
*   **MongoDB**: NoSQL database for storing song data and user information.
*   **Mongoose**: MongoDB object modeling for Node.js. (Note: currently direct MongoDB driver is used, Mongoose could be added for more robust schemas).
*   **Winston**: For structured logging.
*   **bcryptjs**: For password hashing.
*   **jsonwebtoken**: For JWT authentication.
*   **docx**: For generating Word documents.
*   **pptxgenjs**: For generating PowerPoint presentations.
*   **textract**: For extracting text from existing PowerPoint files (PPTX).
*   **Archiver**: For creating ZIP archives.

### Frontend
*   **React**: JavaScript library for building user interfaces.
*   **TypeScript**: Statically typed superset of JavaScript.
*   **Vite**: Fast frontend build tool.
*   **HTML/CSS**: For structuring and styling the web interface.

### Infrastructure
*   **Docker**: Containerization platform.
*   **Docker Compose**: Tool for defining and running multi-container Docker applications.
*   **MongoDB (Docker)**: MongoDB instance running in a Docker container.

## 🛠️ Setup and Running the Application

### Prerequisites
*   **Git**: For cloning the repository.
*   **Node.js & npm**: If running frontend/backend outside Docker (though Docker is recommended).
*   **Docker & Docker Compose**: **Recommended** for easy setup and deployment.

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd Auto_ppt_word
```
*(Replace `<your-repository-url>` with the actual URL of your Git repository)*

### 2. Configure Environment Variables
Create a `.env` file in the project root based on the `.env.example` file. This file contains sensitive information and configuration.
```bash
cp .env.example .env
```
Edit the `.env` file and replace placeholder values:
```dotenv
MONGO_URI=mongodb://mongo:27017 # Keep this as is for Docker Compose setup
JWT_SECRET=your_super_secret_jwt_key_here # CHANGE THIS TO A STRONG, RANDOM STRING!
VITE_API_URL=http://localhost:3000 # Point to your backend service
```

### 3. Initialize Song Database
The backend includes a script to import initial song data from `resources/songs_db.json` into MongoDB.
You can run this manually:
```bash
cd backend
npm install # Install backend dependencies if not already done
npm run db:import
cd ..
```
*Alternatively, you can manually import `songs_db.json` into your MongoDB instance if running outside Docker Compose.*

### 4. Run the Application with Docker Compose (Recommended)
This is the easiest way to get the entire application stack running (frontend, backend, MongoDB).

```bash
docker-compose up --build
```
*   The `--build` flag will build the Docker images. Use it initially and whenever you modify `Dockerfile`s or `docker-compose.yml`.
*   For detached mode (run in background), use `docker-compose up -d --build`.

**Access the Application:**
*   **Frontend**: Open your browser and navigate to `http://localhost:5173`
*   **Backend API**: Accessible at `http://localhost:3000`

### 5. Running Frontend and Backend Separately (For Development without Docker Compose)

#### Backend
```bash
cd backend
npm install
npm run dev # For development with hot-reloading
# or npm start # For production build
```
Backend will run on `http://localhost:3000`.

#### Frontend
```bash
cd frontend
npm install
npm run dev # For development with hot-reloading
# or npm run build && serve -s dist # For production build (you'll need 'serve' package)
```
Frontend will run on `http://localhost:5173`.

## 🧪 Usage

1.  **Register & Login**: On the frontend at `http://localhost:5173`, register a new user and log in to obtain a JWT token. This token will be stored in your browser's local storage.
2.  **Song Management**: Use the UI to search, add, edit, or delete songs. Note that adding, editing, and deleting require you to be logged in.
3.  **Generate Files**: Select the desired songs and click "Generate Files" to download a ZIP archive containing the generated Word and PowerPoint documents. This also requires you to be logged in.

## 🧹 Cleaning Up

### Docker Compose
To stop and remove all services, networks, and volumes created by Docker Compose:
```bash
docker-compose down -v
```

### Local Builds
To remove generated build artifacts:
```bash
# For backend
rm -rf backend/dist backend/node_modules error.log combined.log generator-error.log generator-combined.log
# For frontend
rm -rf frontend/dist frontend/node_modules
```

## ⚠️ Important Notes

*   **Security**: The `JWT_SECRET` in `.env.example` is for development only. **Always use a strong, unique, and securely managed secret in production.**
*   **PPTX Text Extraction**: The `textract` library used for PPTX lyric extraction might have some unpatched security vulnerabilities as reported by `npm audit`. This was chosen as the most viable option for PPTX parsing in Node.js at the time of development. Address this with caution if the application handles untrusted PPTX files.
*   **Old .ppt Files**: The current implementation can only extract text from `.pptx` files. Old `.ppt` files are identified but their content cannot be extracted automatically.

## 部署策略建議 (Deployment Strategy Recommendation)

Refer to the `deployment_strategy.md` file in the project root for detailed recommendations on deploying this application to a production environment. (Note: This file will be removed after review for project cleanliness, but its content is incorporated here).

---
**(End of README.md content)**


## docker build & docker push
```bash
docker buildx build --no-cache --platform linux/amd64 -t asher31892774/church-frontend:latest ./frontend
docker buildx build --no-cache --platform linux/amd64 -t asher31892774/church-backend:latest ./backend
docker push asher31892774/church-frontend:latest
docker push asher31892774/church-backend:latest
```

```bash
docker-compose down
docker-compose up -d --build
```