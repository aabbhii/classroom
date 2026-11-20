# 🎓 Smart Classroom Management System

A full-stack, enterprise-grade classroom management application featuring role-based dashboards (Student, Faculty, Admin), interactive timetables, real-time announcements, lecture resources repository with file uploads, academic event calendars, a cross-department student project collaboration hub, an AI Study Assistant (PDF Q&A and curriculum quiz generator), and Gemini-powered multimedia studio (audio transcription and Veo video generation).

---

## 🚀 Key Features

- **Unified Full-Stack Architecture**: Single server serving both the React frontend (Vite/SPA) and complete Express REST APIs.
- **Role-Based Access Control**:
  - **Student**: View schedules, study notes, join project teams, ask AI study questions.
  - **Faculty**: Upload lecture notes, manage assignments, schedule tests, approve team join requests.
  - **Admin**: Create, edit, and manage classrooms and departments across the university.
- **AI Study Assistant**:
  - Interactive Q&A grounded in uploaded course PDFs with page citations.
  - Generates comprehensive markdown study summaries, section breakdowns, and multiple-choice quizzes.
- **Multimodal AI Studio**: Server-side Google Gemini integration for audio transcription and Veo video generation.
- **Persistent Data Store**: Automatic file-backed JSON database (`data/database.json`) seeded with demo data that persists across reboots.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion, Recharts, Vite.
- **Backend**: Node.js, Express, Multer (file uploads), CORS, `@google/genai`.
- **Database**: **PostgreSQL** (with auto-table migration and seed via `pg` connection pool) + zero-downtime local persistence fallback.

---

## 🐘 PostgreSQL Setup & Configuration

You can connect to **any PostgreSQL database** (local PostgreSQL, Supabase, Neon, Render, Railway, AWS RDS, or Docker).

### Option A: Free Cloud PostgreSQL (Recommended - 30 seconds setup)
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy your connection string into [.env](.env):
   ```env
   DATABASE_URL="postgresql://user:password@ep-sample-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
3. Restart the server (`npm run dev`). The server will automatically connect, execute `server/schema.sql`, create all 8 tables, and seed initial demo data!

### Option B: Local PostgreSQL via Docker Compose
Run PostgreSQL in the background with a single command:
```bash
docker compose up -d postgres
```
This runs PostgreSQL on `localhost:5432` and mounts `server/schema.sql` automatically.

Set in your [.env](.env):
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/classroom_db"
```

### Option C: Manual Local PostgreSQL
If you already have PostgreSQL installed on your computer:
1. Create a database: `CREATE DATABASE classroom_db;`
2. Run the DDL script: `psql -U postgres -d classroom_db -f server/schema.sql`
3. Set your credentials in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/classroom_db"
   ```

*(Note: If `DATABASE_URL` is omitted, the backend seamlessly falls back to the persistent file store without crashing).*

---

## 📦 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
git clone <repository-url>
cd classsroom_project
npm install
```

### 3. Environment Configuration
Create or configure your `.env` file (copied from `.env.example`):
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY="" # Optional: Add your Gemini API key for live video & audio AI
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 🚢 Ready to Deploy

### Option 1: Direct Node.js Production Build
```bash
# 1. Build client and server bundles
npm run build

# 2. Start production server
npm start
```
The server will run on port `5000` (or the `$PORT` environment variable if defined).

---

### Option 2: Docker / Container Deployment
A production multi-stage `Dockerfile` is included.

```bash
# Build the container
docker build -t smart-classroom .

# Run the container
docker run -p 5000:5000 --env-file .env smart-classroom
```

---

### Option 3: Deploy to Cloud Run / Render / Railway
This project is configured out-of-the-box for cloud platforms:
1. **Google Cloud Run**:
   - Push repository to GitHub or use Google Cloud CLI:
     ```bash
     gcloud run deploy smart-classroom --source .
     ```
   - Cloud Run automatically injects `$PORT` (typically 8080) which our server binds to dynamically.
2. **Render / Railway / Fly.io**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Node Version: `>= 20.0.0`

---

## 👥 Demo Accounts

The system includes pre-seeded demo accounts. Click **Role Switcher** in the top banner or log in using:

| Role | Email | Password |
|---|---|---|
| **Student** | `alex.student@college.edu` | *(any password)* |
| **Faculty** | `prof.sharma@college.edu` | *(any password)* |
| **Admin** | `admin@college.edu` | *(any password)* |

---

## 📡 REST API Endpoints Overview

- **Auth**: `POST /api/auth/login`
- **Classrooms**: `GET`, `POST`, `PUT`, `DELETE /api/classrooms`
- **Timetable**:
  - `GET /api/timetable/classroom/:id/weekly`
  - `GET /api/timetable/classroom/:id/day/:day`
  - `GET /api/timetable/faculty/:id/weekly`
  - `POST`, `PUT`, `DELETE /api/timetable`
- **Announcements**:
  - `GET /api/announcements/feed`
  - `GET /api/announcements/classroom/:id`
  - `POST`, `PUT`, `DELETE /api/announcements`
- **Events**:
  - `GET /api/events/classroom/:id`
  - `GET /api/events/classroom/:id/upcoming`
  - `POST`, `PUT`, `DELETE /api/events`
- **Resources**:
  - `GET /api/resources/classroom/:id`
  - `POST /api/resources` (multipart/form-data upload)
  - `PUT`, `DELETE /api/resources/:id`
- **Projects & Collaboration**:
  - `GET /api/projects`
  - `GET /api/projects/:id`
  - `POST`, `PUT`, `DELETE /api/projects`
  - `POST /api/projects/:id/join`
  - `PUT /api/projects/requests/:id/accept`
- **Study AI Assistant**:
  - `GET /api/study/health`
  - `GET /api/study/documents`
  - `POST /api/study/documents` (PDF upload & indexing)
  - `POST /api/study/documents/:id/ask` (contextual grounded Q&A)
  - `POST /api/study/study-mode` (study guide + quiz generation)
- **AI Media Studio**:
  - `POST /api/ai/transcribe`
  - `POST /api/ai/generate-video`
  - `POST /api/ai/video-status`
  - `POST /api/ai/video-download`
- **Health Check**: `GET /api/health`
