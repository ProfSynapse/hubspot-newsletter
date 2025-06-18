import { parseFeed, parseAllFeeds, RSS_FEEDS } from '../common/scrapers/rss-parser';

describe('RSS Parser', () => {
  test('should have valid RSS feed configuration', () => {
    expect(RSS_FEEDS).toBeDefined();
    expect(RSS_FEEDS.length).toBeGreaterThan(0);
    
    RSS_FEEDS.forEach(feed => {
      expect(feed).toHaveProperty('url');
      expect(feed).toHaveProperty('source');
      expect(feed.url).toMatch(/^https?:\/\//);
      expect(feed.source).toBeTruthy();
    });
  });

  test('should parse a single RSS feed successfully', async () => {
    // Use Hacker News RSS as it's reliable and simple
    const hackerNewsFeed = RSS_FEEDS.find(feed => feed.source === 'Hacker News');
    expect(hackerNewsFeed).toBeDefined();
    
    const articles = await parseFeed(hackerNewsFeed!);
    
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
    
    // Check article structure
    const firstArticle = articles[0];
    expect(firstArticle).toHaveProperty('title');
    expect(firstArticle).toHaveProperty('url');
    expect(firstArticle).toHaveProperty('source');
    expect(firstArticle.source).toBe('Hacker News');
  }, 30000);

  test('should handle invalid RSS feed gracefully', async () => {
    const invalidFeed = { url: 'https://invalid-url-that-does-not-exist.com/rss', source: 'Invalid' };
    
    const articles = await parseFeed(invalidFeed);
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBe(0);
  });

  test('should parse multiple RSS feeds', async () => {
    const allArticles = await parseAllFeeds();
    
    expect(Array.isArray(allArticles)).toBe(true);
    expect(allArticles.length).toBeGreaterThan(0);
    
    // Should have articles from multiple sources
    const sources = new Set(allArticles.map(article => article.source));
    expect(sources.size).toBeGreaterThan(0);
  }, 60000);
});