import { query, getRecentArticles } from './common/database/postgres';
import { scrapeImagesOnly } from './common/scrapers/content-scraper';
import dotenv from 'dotenv';

dotenv.config({ path: '/mnt/c/Users/Joseph/Documents/Code/hubspot-newsletter/.env' });

async function backfillImages() {
  try {
    console.log('🔄 Starting image backfill for existing articles...');
    
    // Get ALL articles that don't have images
    const articlesResult = await query(`
      SELECT * FROM articles 
      WHERE (images IS NULL OR images = '[]') 
      ORDER BY scraped_at DESC
    `);
    
    const articles = articlesResult.rows.map((row: any) => ({
      ...row,
      images: row.images ? JSON.parse(row.images) : []
    }));
    
    console.log(`📄 Found ${articles.length} articles to process`);
    
    if (articles.length === 0) {
      console.log('✅ No articles need image backfill');
      return;
    }
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    const totalArticles = articles.length;
    
    console.log(`⏳ Processing ${totalArticles} articles in batches of 10...`);
    
    // Process articles in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(articles.length / batchSize);
      
      console.log(`\n📦 Processing batch ${currentBatch}/${totalBatches} (${batch.length} articles)`);
      
      // Process batch articles sequentially to avoid rate limiting
      for (const article of batch) {
        const progress = `[${processed + 1}/${totalArticles}]`;
        
        try {
          console.log(`\n🔍 ${progress} Processing: ${article.title.substring(0, 60)}...`);
          console.log(`🌐 URL: ${article.url}`);
          console.log(`📰 Source: ${article.source}`);
          
          // Scrape images for this article
          const scrapedArticle = await scrapeImagesOnly(article);
          
          if (scrapedArticle.images && scrapedArticle.images.length > 0) {
            // Update the article with extracted images
            await query(`
              UPDATE articles 
              SET images = $1 
              WHERE id = $2
            `, [JSON.stringify(scrapedArticle.images), article.id]);
            
            console.log(`✅ ${progress} SUCCESS: Found ${scrapedArticle.images.length} images`);
            scrapedArticle.images.forEach((img, i) => {
              console.log(`   📸 Image ${i + 1}: ${img.url}`);
              console.log(`       Alt: ${img.alt || 'No alt text'}`);
            });
            updated++;
          } else {
            console.log(`⚠️  ${progress} NO IMAGES FOUND`);
            console.log(`   Click URL above to investigate manually ↑`);
          }
          
          processed++;
          
          // Better rate limiting between articles (2-5 seconds with randomness)
          const delay = 2000 + Math.random() * 3000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (error) {
          console.error(`❌ ${progress} ERROR processing article ${article.id}:`);
          console.error(`    URL: ${article.url}`);
          console.error(`    Error: ${(error as any).message || error}`);
          errors++;
          processed++;
        }
      }
      
      // Longer pause between batches (5-10 seconds)
      if (i + batchSize < articles.length) {
        const batchDelay = 5000 + Math.random() * 5000;
        console.log(`⏸️  Pausing ${Math.round(batchDelay/1000)}s between batches... (Progress: ${processed}/${totalArticles})`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
    
    console.log(`\n🎉 Backfill completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Total processed: ${processed}`);
    console.log(`   • Successfully updated: ${updated}`);
    console.log(`   • Errors: ${errors}`);
    console.log(`   • Success rate: ${((updated / processed) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

backfillImages();