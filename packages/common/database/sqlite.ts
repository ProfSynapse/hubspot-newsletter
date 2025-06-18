import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './database/newsletter.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

export const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<void>;
export const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
export const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;

export async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      await run(statement);
    }
    
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export interface Article {
  id?: number;
  title: string;
  content?: string;
  excerpt?: string;
  source: string;
  url: string;
  author?: string;
  published_at?: string;
  category?: string;
  scraped_at?: string;
}

export async function insertArticle(article: Article): Promise<void> {
  const query = `
    INSERT OR IGNORE INTO articles (title, content, excerpt, source, url, author, published_at, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(query, [
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

export async function getRecentArticles(hours: number = 24): Promise<Article[]> {
  const query = `
    SELECT * FROM articles 
    WHERE datetime(scraped_at) > datetime('now', '-${hours} hours')
    ORDER BY published_at DESC
  `;
  
  return await all(query) as Article[];
}

export async function searchArticles(query: string): Promise<Article[]> {
  const searchQuery = `
    SELECT * FROM articles 
    WHERE (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)
    AND datetime(scraped_at) > datetime('now', '-48 hours')
    ORDER BY published_at DESC
    LIMIT 20
  `;
  
  const searchTerm = `%${query}%`;
  return await all(searchQuery, [searchTerm, searchTerm, searchTerm]) as Article[];
}

export default db;