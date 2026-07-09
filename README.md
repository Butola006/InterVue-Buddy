# InterVue-Buddy

AI-powered interview prep and resume generation web app.

## Overview

This repository contains a full-stack application with:
- Backend: Node.js + Express + MongoDB + Google Gemini AI + Puppeteer PDF generation
- Frontend: React + Vite + Axios + SCSS

The app supports:
- user authentication
- resume upload / self-description input
- AI-generated interview reports and practice questions
- AI-generated resume PDF download

## Repository Structure

- `.github/workflows/`: GitHub Actions workflows
- `Backend/`: backend service
  - `src/app.js`: Express server and API routes
  - `src/server.js`: server launcher
  - `src/config/database.js`: MongoDB connection
  - `src/controllers/`: auth and interview controllers
  - `src/services/`: AI and PDF generation logic
  - `src/middlewares/`: auth and file upload middleware
  - `src/models/`: Mongoose models
  - `src/routes/`: API route definitions
- `Frontend/`: React client
  - `src/main.jsx`: app entry
  - `src/App.jsx`: application shell and routes
  - `src/features/`: auth and interview feature modules
  - `src/styles/`: shared styling
  - `src/features/interview/style/`: page-specific SCSS

## Local Setup

### 1. Backend

1. Navigate to `Backend`
2. Install dependencies:
   ```bash
   cd Backend
   npm install
   ```
3. Add a `.env` file in `Backend/` with:
   ```dotenv
   MONGO_URI=your-mongo-connection-string
   JWT_SECRET=your-jwt-secret
   GOOGLE_GENAI_API_KEY=your-google-genai-api-key
   FRONTEND_URL=http://localhost:5173
   ```
4. Run the backend:
   ```bash
   npm start
   ```

### 2. Frontend

1. Navigate to `Frontend`
2. Install dependencies:
   ```bash
   cd Frontend
   npm install
   ```
3. Run the frontend:
   ```bash
   npm run dev
   ```

### 3. Frontend API configuration

The frontend reads the backend URL from `VITE_API_BASE_URL`.
- In development, it defaults to `http://localhost:3001`
- For production builds, set:
  - `VITE_API_BASE_URL=https://your-backend-url`

## Notes

- This repo is the source code and proof of work.
- The backend cannot be hosted on GitHub Pages; it requires a Node-compatible server (Railway, Fly.io, Vercel, etc.).
- The frontend can be deployed as a static site if built separately.

## Recommended Next Steps

- Push this repo to GitHub
- Add `README.md` content as the project description
- Add environment variables securely in your hosting provider
- Use `Backend/.env` locally only; never commit secrets

## Authors

- Developed by Aditya
