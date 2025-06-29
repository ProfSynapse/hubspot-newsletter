import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Railway PostgreSQL connection string format
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('WARNING: DATABASE_URL or POSTGRES_URL environment variable is not set. Database features will be disabled.');
}

const pool = connectionString ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

// Test connection on startup
if (pool) {
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });
}

export async function query(text: string, params?: any[]): Promise<any> {
  if (!pool) {
    throw new Error('Database not configured');
  }
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function initializeDatabase(): Promise<void> {
  if (!pool) {
    console.log('Database not configured - skipping initialization');
    return;
  }
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        excerpt TEXT,
        source TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        author TEXT,
        published_at TIMESTAMP,
        category TEXT,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const createIndexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_published ON articles(published_at);',
      'CREATE INDEX IF NOT EXISTS idx_source ON articles(source);',
      'CREATE INDEX IF NOT EXISTS idx_scraped ON articles(scraped_at);'
    ];
    
    await query(createTableQuery);
    
    for (const indexQuery of createIndexQueries) {
      await query(indexQuery);
    }
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export interface ArticleImage {
  url: string;
  alt?: string;
  caption?: string;
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
  images?: ArticleImage[];
}

export async function insertArticle(article: Article): Promise<void> {
  const insertQuery = `
    INSERT INTO articles (title, content, excerpt, source, url, author, published_at, category, images)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (url) DO NOTHING
  `;
  
  await query(insertQuery, [
    article.title,
    article.content,
    article.excerpt,
    article.source,
    article.url,
    article.author,
    article.published_at,
    article.category,
    article.images ? JSON.stringify(article.images) : null
  ]);
}

export async function getRecentArticles(hours: number = 24): Promise<Article[]> {
  const selectQuery = `
    SELECT * FROM articles 
    WHERE scraped_at > NOW() - INTERVAL '${hours} hours'
    ORDER BY published_at DESC
    LIMIT 1000
  `;
  
  const result = await query(selectQuery);
  return result.rows.map((row: any) => ({
    ...row,
    images: row.images ? JSON.parse(row.images) : []
  }));
}

// Legacy function - no longer used since we removed keyword search
export async function searchArticles(searchQuery: string): Promise<Article[]> {
  const selectQuery = `
    SELECT * FROM articles 
    WHERE (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1)
    AND scraped_at > NOW() - INTERVAL '48 hours'
    ORDER BY published_at DESC
    LIMIT 100
  `;
  
  const searchTerm = `%${searchQuery}%`;
  const result = await query(selectQuery, [searchTerm]);
  return result.rows.map((row: any) => ({
    ...row,
    images: row.images ? JSON.parse(row.images) : []
  }));
}

export async function getArticlesByIds(ids: number[]): Promise<Article[]> {
  if (ids.length === 0) {
    return [];
  }
  
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
  const selectQuery = `
    SELECT * FROM articles 
    WHERE id IN (${placeholders})
    ORDER BY published_at DESC
  `;
  
  const result = await query(selectQuery, ids);
  return result.rows.map((row: any) => ({
    ...row,
    images: row.images ? JSON.parse(row.images) : []
  }));
}

export async function cleanOldArticles(days: number = 7): Promise<void> {
  const deleteQuery = `
    DELETE FROM articles 
    WHERE scraped_at < NOW() - INTERVAL '${days} days'
  `;
  
  await query(deleteQuery);
}

export default pool;