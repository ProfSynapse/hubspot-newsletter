import { initializeDatabase, insertArticle, cleanOldArticles } from './common/database/postgres';
import { parseAllFeeds } from './common/scrapers/rss-parser';
import { scrapeArticles } from './common/scrapers/content-scraper';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runScraper() {
  console.log('🚀 Starting scheduled article scraping...');
  
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Parse RSS feeds
    const articles = await parseAllFeeds();
    console.log(`📄 Parsed ${articles.length} articles from RSS feeds`);
    
    if (articles.length === 0) {
      console.log('⚠️ No articles found, exiting');
      process.exit(0);
    }
    
    // Scrape full content for articles
    const scrapedArticles = await scrapeArticles(articles);
    console.log(`🔍 Scraped content for ${scrapedArticles.length} articles`);
    
    // Store in database
    let stored = 0;
    for (const article of scrapedArticles) {
      try {
        await insertArticle(article);
        stored++;
      } catch (err: any) {
        if (!err.message?.includes('UNIQUE constraint')) {
          console.error('❌ Error storing article:', err);
        }
        // Ignore duplicate URL errors
      }
    }
    
    console.log(`💾 Successfully stored ${stored} new articles`);
    
    // Clean old articles (older than 7 days)
    await cleanOldArticles(7);
    console.log('🧹 Cleaned old articles');
    
    console.log('✅ Scraping job completed successfully');
    
  } catch (error) {
    console.error('💥 Error during scraping:', error);
    process.exit(1);
  }
  
  // Important: Exit properly for Railway cron jobs
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runScraper();
}

export default runScraper;