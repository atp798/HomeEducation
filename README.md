# 家庭教育咨询 - AI Home Education Consulting

A full-stack AI-powered home education consulting web application built with Node.js + Express (backend) and React + Vite (frontend).

## Features

- AI chat consulting powered by OpenAI-compatible APIs with real-time SSE streaming
- Email/password registration and login
- Phone number + OTP login (mock SMS for development)
- Session history with filter, archive, and delete
- User settings: theme (light/dark/system), notifications, DND hours
- Security center: login record history
- Mobile-first responsive design with swipe gesture navigation
- Dark mode support

## Project Structure

```
HomeEducation/
├── backend/          Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── config.ts          App configuration
│   │   ├── index.ts           Express server entry point
│   │   ├── db/
│   │   │   ├── adapter.ts     DatabaseAdapter interface
│   │   │   ├── sqlite.ts      SQLite implementation
│   │   │   └── migrations.ts  Database schema
│   │   ├── repositories/      Data access layer
│   │   ├── routes/            API route handlers
│   │   ├── services/ai.ts     OpenAI-compatible streaming client
│   │   ├── middleware/auth.ts  JWT middleware
│   │   └── utils/crypto.ts    Password & OTP utilities
│   └── data/                  SQLite database (auto-created)
└── frontend/         React + Vite + TypeScript frontend
    └── src/
        ├── api/client.ts      HTTP + SSE API client
        ├── store/             Zustand state stores
        ├── hooks/             Custom React hooks
        ├── components/        Reusable UI components
        └── pages/             Application pages
```

## Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your values:

```env
PORT=3001
JWT_SECRET=your-long-random-secret-key-here

# AI API (OpenAI-compatible)
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-api-key-here
AI_MODEL=gpt-4o-mini

# Database
DB_PATH=./data/app.db
```

### 3. Run Development Servers

In two separate terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The app will be available at **http://localhost:5173**

The backend API runs at **http://localhost:3001**

## AI Configuration

The backend uses an OpenAI-compatible API format. You can use:

- **OpenAI**: Set `AI_BASE_URL=https://api.openai.com/v1` and your OpenAI API key
- **Local Ollama**: Set `AI_BASE_URL=http://localhost:11434/v1` and `AI_MODEL=llama3`
- **Other providers**: Any OpenAI-compatible endpoint works

## Database

The app uses SQLite by default with a repository pattern that makes it easy to swap to MySQL or PostgreSQL. To add a new database backend, implement the `DatabaseAdapter` interface in `backend/src/db/adapter.ts`.

## Production Build

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

## Development Notes

- OTP codes are returned in the API response in development mode (mock SMS)
- The database file is created automatically at `backend/data/app.db`
- JWT tokens expire in 7 days
