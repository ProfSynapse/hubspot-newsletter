# 📰 HubSpot Newsletter Bot - Implementation Guide

## 🚀 Quick Start

### **Project Setup**
```bash
# 1. Create monorepo structure
mkdir hubspot-newsletter-bot
cd hubspot-newsletter-bot

# 2. Initialize root package.json with workspaces
npm init -y
# Edit package.json to add: "workspaces": ["packages/*"]

# 3. Create backend
mkdir -p packages/backend/src
cd packages/backend
npm init -y
npm install express sqlite3 rss-parser cheerio @mozilla/readability jsdom node-cron cors dotenv
npm install -D typescript @types/node @types/express ts-node nodemon

# 4. Create frontend
cd ..
npx create-react-app frontend --template typescript
cd frontend
npm install axios tailwindcss lucide-react

# 5. Create database folder
cd ../..
mkdir database
```

### **Environment Variables (.env)**
```bash
OPENROUTER_API_KEY=your_openrouter_api_key
NODE_ENV=development
DATABASE_PATH=./database/newsletter.db
PORT=3000
```

## 📁 Project Structure
```
hubspot-newsletter-bot/
├── 📦 package.json (workspace root)
├── 📁 packages/
│   ├── 📁 backend/
│   │   ├── 📁 src/
│   │   │   ├── 🔄 scrapers/
│   │   │   │   ├── rss-parser.ts
│   │   │   │   └── content-scraper.ts
│   │   │   ├── 🤖 ai/
│   │   │   │   └── newsletter-generator.ts
│   │   │   ├── 📡 api/
│   │   │   │   └── routes.ts
│   │   │   ├── 🗄️ database/
│   │   │   │   └── sqlite.ts
│   │   │   └── server.ts
│   │   ├── 📦 package.json
│   │   └── 🔧 tsconfig.json
│   └── 📁 frontend/
│       ├── 📁 src/
│       │   ├── 📱 components/
│       │   ├── 🎨 styles/
│       │   └── App.tsx
│       └── 📦 package.json
├── 📁 database/
│   └── 📊 newsletter.db (SQLite file)
└── 📄 README.md
```

## 🔧 Implementation Checklist

### **Backend (packages/backend/)**
- [ ] **Express server setup** with TypeScript
- [ ] **SQLite database** with articles table
- [ ] **RSS feed parser** for business news sources
- [ ] **Content scraper** with Cheerio + Readability
- [ ] **OpenRouter integration** for AI generation
- [ ] **API routes** for newsletter generation
- [ ] **Cron jobs** for periodic scraping

### **Frontend (packages/frontend/)**
- [ ] **React setup** with TypeScript and Tailwind
- [ ] **Landing page** with branded HubSpot/Hustle design
- [ ] **Newsletter display** with The Hustle formatting
- [ ] **API integration** for newsletter generation
- [ ] **Loading states** and error handling

### **Deployment (Railway)**
- [ ] **Railway configuration** for Node.js deployment
- [ ] **Environment variables** setup
- [ ] **Database persistence** configuration
- [ ] **Health check** endpoint

## 🎯 RSS Feeds to Implement
```typescript
const RSS_FEEDS = [
  'https://techcrunch.com/feed/',
  'https://feeds.bloomberg.com/technology',
  'https://www.theverge.com/rss/index.xml',
  'https://hnrss.org/frontpage',
  'https://feeds.arstechnica.com/arstechnica/technology-lab'
];
```

## 🤖 Sample Newsletter Generation Prompt
```typescript
const generateNewsletterPrompt = (userQuery: string, articles: Article[]) => `
You are a newsletter writer for The Hustle. Create a personalized newsletter based on:

USER INTEREST: "${userQuery}"

TODAY'S RELEVANT NEWS:
${articles.map(a => `- ${a.title}: ${a.excerpt}`).join('\n')}

REQUIREMENTS:
- Write in The Hustle's conversational, business-focused style
- Include 3-4 key stories with brief analysis
- Add "Why this matters for your business" insights
- Use emojis for story headers (🔥, 💰, 📊)
- Keep it to a 5-minute read
- End with actionable advice

Generate a compelling newsletter that connects today's news to the user's interests.
`;
```

## 📊 Demo Strategy

### **Assessment Positioning**
1. **Part 1**: "Identified research bottleneck as biggest operational challenge"
2. **Part 2**: "Built working prototype that demonstrates real solution"
3. **Part 3**: "Designed for integration into existing editorial workflows"

### **Live Demo Flow**
1. Show clean, branded interface
2. Input business-relevant query (e.g., "SaaS pricing strategies")
3. Generate newsletter in real-time
4. Highlight The Hustle's voice and business insights
5. Demonstrate different query for versatility

### **Technical Highlights**
- **Real scraping**: Not just API calls, actual content extraction
- **Brand integration**: Professional UI that respects both brands
- **AI model flexibility**: OpenRouter allows model switching
- **Production ready**: Deployed, working application

---

**This implementation demonstrates technical depth, business understanding, and product thinking - exactly what HubSpot Media needs for scaling their content operations.**