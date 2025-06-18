import { RSS_FEEDS, parseFeed } from '../common/scrapers/rss-parser';
import Parser from 'rss-parser';

describe('RSS Feeds Validation', () => {
  const parser = new Parser({ timeout: 15000 });

  test('all RSS feed URLs should be valid and accessible', async () => {
    const results = [];
    
    for (const feed of RSS_FEEDS) {
      console.log(`Testing RSS feed: ${feed.source} - ${feed.url}`);
      
      try {
        const parsedFeed = await parser.parseURL(feed.url);
        
        results.push({
          source: feed.source,
          url: feed.url,
          status: 'success',
          itemCount: parsedFeed.items?.length || 0,
          title: parsedFeed.title,
          description: parsedFeed.description
        });
        
        // Basic validation checks
        expect(parsedFeed).toBeDefined();
        expect(parsedFeed.items).toBeDefined();
        expect(Array.isArray(parsedFeed.items)).toBe(true);
        expect(parsedFeed.items.length).toBeGreaterThan(0);
        
      } catch (error: any) {
        results.push({
          source: feed.source,
          url: feed.url,
          status: 'failed',
          error: error.message
        });
        
        console.error(`❌ Failed to parse ${feed.source}: ${error.message}`);
      }
    }
    
    // Log results summary
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    
    console.log(`\n📊 RSS Feed Validation Summary:`);
    console.log(`✅ Successful feeds: ${successful.length}/${RSS_FEEDS.length}`);
    console.log(`❌ Failed feeds: ${failed.length}/${RSS_FEEDS.length}`);
    
    if (successful.length > 0) {
      console.log(`\n✅ Working feeds:`);
      successful.forEach(feed => {
        console.log(`  - ${feed.source}: ${feed.itemCount} items`);
      });
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed feeds:`);
      failed.forEach(feed => {
        console.log(`  - ${feed.source}: ${feed.error}`);
      });
    }
    
    // Test should pass if at least 80% of feeds are working
    const successRate = (successful.length / RSS_FEEDS.length) * 100;
    expect(successRate).toBeGreaterThanOrEqual(80);
  }, 60000); // 60 second timeout for all feeds

  test('each working RSS feed should return valid article data', async () => {
    const workingFeeds = [];
    
    // First identify working feeds
    for (const feed of RSS_FEEDS.slice(0, 5)) { // Test first 5 feeds to avoid timeout
      try {
        await parser.parseURL(feed.url);
        workingFeeds.push(feed);
      } catch (error) {
        console.log(`Skipping ${feed.source} - not accessible`);
      }
    }
    
    expect(workingFeeds.length).toBeGreaterThan(0);
    
    // Test article parsing for working feeds
    for (const feed of workingFeeds) {
      const articles = await parseFeed(feed);
      
      expect(Array.isArray(articles)).toBe(true);
      
      if (articles.length > 0) {
        const firstArticle = articles[0];
        
        // Validate article structure
        expect(firstArticle).toHaveProperty('title');
        expect(firstArticle).toHaveProperty('source');
        expect(firstArticle).toHaveProperty('url');
        expect(firstArticle.source).toBe(feed.source);
        expect(typeof firstArticle.title).toBe('string');
        expect(typeof firstArticle.url).toBe('string');
        expect(firstArticle.title.length).toBeGreaterThan(0);
        expect(firstArticle.url.length).toBeGreaterThan(0);
        
        console.log(`✅ ${feed.source}: ${articles.length} articles parsed successfully`);
      }
    }
  }, 45000); // 45 second timeout

  test('RSS feed URLs should be properly formatted', () => {
    RSS_FEEDS.forEach(feed => {
      // Check URL format
      expect(feed.url).toMatch(/^https?:\/\/.+/);
      
      // Check source name
      expect(feed.source).toBeDefined();
      expect(typeof feed.source).toBe('string');
      expect(feed.source.length).toBeGreaterThan(0);
      
      console.log(`📝 Feed validation: ${feed.source} - ${feed.url}`);
    });
  });

  test('RSS feeds should have unique URLs and sources', () => {
    const urls = RSS_FEEDS.map(feed => feed.url);
    const sources = RSS_FEEDS.map(feed => feed.source);
    
    // Check for duplicate URLs
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);
    
    // Check for duplicate sources
    const uniqueSources = new Set(sources);
    expect(uniqueSources.size).toBe(sources.length);
  });

  test('RSS feed configuration should match expected structure', () => {
    expect(RSS_FEEDS).toBeDefined();
    expect(Array.isArray(RSS_FEEDS)).toBe(true);
    expect(RSS_FEEDS.length).toBeGreaterThan(10); // Should have substantial number of feeds
    
    RSS_FEEDS.forEach(feed => {
      expect(feed).toHaveProperty('url');
      expect(feed).toHaveProperty('source');
      expect(typeof feed.url).toBe('string');
      expect(typeof feed.source).toBe('string');
    });
  });
});