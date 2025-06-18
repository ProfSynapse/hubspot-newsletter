# HubSpot Newsletter Bot

AI-powered newsletter generator using Google Gemini 2.5 Pro, built for HubSpot Media assessment.

## 🚀 Railway Deployment

This is a shared monorepo with multiple services:

### Services Required:
1. **Backend Service** - Express API + Frontend serving
2. **Scraper Service** - RSS scraping cron job

### Environment Variables:
```
OPENROUTER_API_KEY=your_openrouter_api_key
NODE_ENV=production
DATABASE_PATH=./database/newsletter.db
PORT=3000
```

## 📦 Project Structure
```
├── packages/
│   ├── backend/          # Express API server
│   ├── frontend/         # React app
│   ├── common/           # Shared utilities
│   └── scraper/          # Cron job service
├── database/             # SQLite storage
└── package.json          # Monorepo config
```

## 🔧 Local Development
```bash
npm install
npm run build
npm run dev
```

## 🧪 Testing
```bash
npm run test --workspace=backend
```