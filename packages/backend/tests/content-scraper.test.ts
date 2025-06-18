import { scrapeFullContent, scrapeArticles } from '../../common/scrapers/content-scraper';
import { Article } from '../../common/database/sqlite';

describe('Content Scraper', () => {
  const sampleArticle: Article = {
    title: 'Test Article',
    excerpt: 'This is a test excerpt',
    source: 'Test Source',
    url: 'https://httpbin.org/html', // Returns basic HTML
    published_at: new Date().toISOString()
  };

  test('should scrape content from valid URL', async () => {
    const result = await scrapeFullContent(sampleArticle);
    
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('content');
    expect(typeof result.content).toBe('string');
  }, 30000);

  test('should handle invalid URL gracefully', async () => {
    const invalidArticle: Article = {
      ...sampleArticle,
      url: 'https://invalid-url-that-does-not-exist-12345.com'
    };
    
    const result = await scrapeFullContent(invalidArticle);
    
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('url');
    // Should return original article on error
    expect(result.url).toBe(invalidArticle.url);
  }, 30000);

  test('should skip scraping if content already exists', async () => {
    const articleWithContent: Article = {
      ...sampleArticle,
      content: 'This is existing content that is longer than 500 characters. '.repeat(10)
    };
    
    const result = await scrapeFullContent(articleWithContent);
    
    expect(result.content).toBe(articleWithContent.content);
  });

  test('should scrape multiple articles in batches', async () => {
    const articles: Article[] = [
      { ...sampleArticle, url: 'https://httpbin.org/html' },
      { ...sampleArticle, url: 'https://httpbin.org/json', title: 'Test Article 2' },
      { ...sampleArticle, url: 'https://httpbin.org/xml', title: 'Test Article 3' }
    ];
    
    const results = await scrapeArticles(articles);
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(articles.length);
    
    results.forEach(result => {
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('content');
    });
  }, 60000);

  test('should handle network timeout gracefully', async () => {
    const timeoutArticle: Article = {
      ...sampleArticle,
      url: 'https://httpbin.org/delay/15' // Will timeout
    };
    
    const result = await scrapeFullContent(timeoutArticle);
    
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('url');
    // Should return article with excerpt as content on timeout
    expect(result.content).toBeTruthy();
  }, 30000);
});