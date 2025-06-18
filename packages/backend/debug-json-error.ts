import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root BEFORE importing any modules that use it
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Now import modules after env is loaded
import { curateArticles } from './ai/article-curator';
import { getRecentArticles } from './common/database/postgres';

async function debugJsonError() {
  console.log('🔍 Debug JSON Error Test\n');
  
  try {
    const articles = await getRecentArticles(72);
    console.log(`Found ${articles.length} articles\n`);
    
    // Test the queries that failed with JSON errors
    const problematicQueries = [
      'cryptocurrency and blockchain',
      'tech IPOs and stock market'
    ];
    
    for (const query of problematicQueries) {
      console.log(`\n📋 Testing: "${query}"`);
      try {
        const result = await curateArticles(query, articles);
        console.log(`✅ Success: hasRelevantArticles=${result.hasRelevantArticles}`);
      } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

debugJsonError();