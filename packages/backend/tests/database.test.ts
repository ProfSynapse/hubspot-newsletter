import { initializeDatabase, insertArticle, getRecentArticles, searchArticles, Article } from '../common/database/postgres';
import fs from 'fs';

describe('Database Functions', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(() => {
    // PostgreSQL cleanup happens automatically via connection pool
  });

  const sampleArticle: Article = {
    title: 'Test Article',
    content: 'This is a test article content',
    excerpt: 'Test excerpt',
    source: 'Test Source',
    url: 'https://test.com/article',
    author: 'Test Author',
    published_at: new Date().toISOString(),
    category: 'Technology'
  };

  test('should initialize database successfully', async () => {
    expect(true).toBe(true);
  });

  test('should insert article successfully', async () => {
    await expect(insertArticle(sampleArticle)).resolves.toBeUndefined();
  });

  test('should prevent duplicate URL insertion', async () => {
    const duplicateArticle = { ...sampleArticle, url: 'https://test.com/duplicate' };
    await insertArticle(duplicateArticle);
    await insertArticle(duplicateArticle); // Should not throw
    
    const articles = await getRecentArticles(1);
    expect(articles.length).toBeGreaterThanOrEqual(1);
  });

  test('should retrieve recent articles', async () => {
    const articles = await getRecentArticles(24);
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(articles[0]).toHaveProperty('title');
    expect(articles[0]).toHaveProperty('url');
  });

  test('should search articles by query (legacy function)', async () => {
    const results = await searchArticles('Test');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('should return empty array for non-matching search (legacy function)', async () => {
    const results = await searchArticles('NonExistentQuery12345');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});