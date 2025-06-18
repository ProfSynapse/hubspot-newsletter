"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = exports.get = exports.run = void 0;
exports.initializeDatabase = initializeDatabase;
exports.insertArticle = insertArticle;
exports.getRecentArticles = getRecentArticles;
exports.searchArticles = searchArticles;
const sqlite3_1 = __importDefault(require("sqlite3"));
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbPath = process.env.DATABASE_PATH || './database/newsletter.db';
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3_1.default.Database(dbPath);
exports.run = (0, util_1.promisify)(db.run.bind(db));
exports.get = (0, util_1.promisify)(db.get.bind(db));
exports.all = (0, util_1.promisify)(db.all.bind(db));
async function initializeDatabase() {
    try {
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        const statements = schema.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            await (0, exports.run)(statement);
        }
        console.log('Database schema initialized');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
async function insertArticle(article) {
    const query = `
    INSERT OR IGNORE INTO articles (title, content, excerpt, source, url, author, published_at, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
    await (0, exports.run)(query, [
        article.title,
        article.content,
        article.excerpt,
        article.source,
        article.url,
        article.author,
        article.published_at,
        article.category
    ]);
}
async function getRecentArticles(hours = 24) {
    const query = `
    SELECT * FROM articles 
    WHERE datetime(scraped_at) > datetime('now', '-${hours} hours')
    ORDER BY published_at DESC
  `;
    return await (0, exports.all)(query);
}
async function searchArticles(query) {
    const searchQuery = `
    SELECT * FROM articles 
    WHERE (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)
    AND datetime(scraped_at) > datetime('now', '-48 hours')
    ORDER BY published_at DESC
    LIMIT 20
  `;
    const searchTerm = `%${query}%`;
    return await (0, exports.all)(searchQuery, [searchTerm, searchTerm, searchTerm]);
}
exports.default = db;
