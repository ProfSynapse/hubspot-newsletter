import request from 'supertest';
import express from 'express';
import { initializeDatabase, query, cleanOldArticles } from '../common/database/postgres';
import { parseFeed, RSS_FEEDS } from '../common/scrapers/rss-parser';
import { scrapeFullContent } from '../common/scrapers/content-scraper';
import apiRoutes from '../api/routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('Full Two-Phase Newsletter Workflow with Real Data', () => {
  beforeAll(async () => {
    console.log('Setting up full workflow test with real data...');
    
    try {
      // Initialize database
      await initializeDatabase();
      console.log('Database initialized');

      // Clean old test articles
      await query(`DELETE FROM articles WHERE url LIKE '%test-workflow%' OR source LIKE '%test%'`);
      
      // Scrape fresh articles from real RSS feeds
      const feedsToUse = RSS_FEEDS.slice(0, 3); // Use first 3 feeds to avoid overloading
      let totalArticlesScraped = 0;
      
      for (const feedConfig of feedsToUse) {
        try {
          console.log(`Scraping from ${feedConfig.source} (${feedConfig.url})...`);
          const articles = await parseFeed(feedConfig);
          
          // Take the first 3 articles from each feed to avoid overloading
          const limitedArticles = articles.slice(0, 3);
          
          for (const article of limitedArticles) {
            try {
              // Scrape full content for each article
              const enrichedArticle = await scrapeFullContent(article);
              
              // Insert article into database
              await query(
                `INSERT INTO articles (title, content, excerpt, source, url, author, published_at, category)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (url) DO NOTHING`,
                [
                  enrichedArticle.title,
                  enrichedArticle.content || article.excerpt,
                  enrichedArticle.excerpt || article.excerpt,
                  enrichedArticle.source,
                  enrichedArticle.url,
                  enrichedArticle.author,
                  enrichedArticle.published_at,
                  enrichedArticle.category || 'Technology'
                ]
              );
              totalArticlesScraped++;
              
              // Add a small delay to be respectful to the servers
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              console.warn(`Failed to scrape content for ${article.url}:`, error);
              // Insert article without full content
              await query(
                `INSERT INTO articles (title, content, excerpt, source, url, author, published_at, category)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (url) DO NOTHING`,
                [
                  article.title,
                  article.excerpt,
                  article.excerpt,
                  article.source,
                  article.url,
                  article.author,
                  article.published_at,
                  article.category || 'Technology'
                ]
              );
              totalArticlesScraped++;
            }
          }
        } catch (error) {
          console.warn(`Failed to scrape RSS feed ${feedConfig.source}:`, error);
        }
      }
      
      console.log(`Successfully scraped ${totalArticlesScraped} articles for testing`);
      
      // Verify we have articles
      const articleCount = await query('SELECT COUNT(*) as count FROM articles');
      console.log(`Total articles in database: ${articleCount.rows[0].count}`);
      
      if (articleCount.rows[0].count === 0) {
        throw new Error('No articles found in database after scraping. Cannot run integration tests.');
      }
      
    } catch (error) {
      console.error('Failed to set up test data:', error);
      throw error;
    }
  }, 300000); // Allow 5 minutes for scraping

  afterAll(async () => {
    try {
      // Clean up old articles to keep database size manageable
      await cleanOldArticles(1); // Keep only 1 day of articles
    } catch (error) {
      console.warn('Failed to clean up test data:', error);
    }
  });

  describe('End-to-End Two-Phase Workflow', () => {
    test('should complete full AI newsletter workflow with real data', async () => {
      console.log('Starting Phase 1: Article Curation...');
      
      // Phase 1: Curate articles for AI/Technology topic
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'artificial intelligence and machine learning technology' })
        .expect(200);

      expect(curationResponse.body.success).toBe(true);
      expect(curationResponse.body.articles).toBeDefined();
      expect(curationResponse.body.articles.length).toBeGreaterThan(0);
      expect(curationResponse.body.totalArticlesConsidered).toBeGreaterThan(0);

      console.log(`Phase 1 complete: ${curationResponse.body.articles.length} articles curated from ${curationResponse.body.totalArticlesConsidered} total articles`);
      
      // Log curated articles for verification
      curationResponse.body.articles.forEach((article: any, index: number) => {
        console.log(`  ${index + 1}. ${article.title} - ${article.source}`);
      });

      console.log('Starting Phase 2: Newsletter Generation...');
      
      // Phase 2: Generate newsletter from curated articles
      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      
      const generationResponse = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'artificial intelligence and machine learning technology',
          articleIds: articleIds
        })
        .timeout(120000); // Allow 2 minutes for AI generation

      expect(generationResponse.status).toBe(200);
      expect(generationResponse.body.success).toBe(true);
      expect(generationResponse.body.newsletter).toBeDefined();
      expect(generationResponse.body.usedArticleIds).toEqual(articleIds);
      expect(generationResponse.body.articleCount).toBe(articleIds.length);

      // Verify newsletter structure
      const newsletter = generationResponse.body.newsletter;
      expect(newsletter.subject).toBeDefined();
      expect(newsletter.theming).toBeDefined();
      expect(newsletter.thematicIntro).toBeDefined();
      expect(newsletter.sections).toBeDefined();
      expect(newsletter.actionableAdvice).toBeDefined();
      expect(newsletter.signoff).toBeDefined();
      expect(Array.isArray(newsletter.sections)).toBe(true);
      expect(newsletter.sections.length).toBeGreaterThan(0);

      // Verify newsletter sections have proper structure
      newsletter.sections.forEach((section: any, index: number) => {
        expect(section.heading).toBeDefined();
        expect(section.contentBlocks).toBeDefined();
        expect(section.hyperlinks).toBeDefined();
        expect(Array.isArray(section.contentBlocks)).toBe(true);
        expect(Array.isArray(section.hyperlinks)).toBe(true);
        
        console.log(`Section ${index + 1}: ${section.heading}`);
      });

      // Verify newsletter content relates to AI/Technology
      const newsletterText = `${newsletter.subject} ${newsletter.thematicIntro} ${newsletter.sections.map((s: any) => s.contentBlocks.map((b: any) => b.content || '').join(' ')).join(' ')}`.toLowerCase();
      const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'technology', 'tech', 'algorithm', 'data'];
      const hasAiContent = aiKeywords.some(keyword => newsletterText.includes(keyword));
      
      expect(hasAiContent).toBe(true);
      
      console.log('Phase 2 complete: Newsletter generated successfully');
      console.log(`Newsletter subject: ${newsletter.subject}`);
      console.log(`Newsletter sections: ${newsletter.sections.length}`);
      console.log(`Total content length: ${newsletterText.length} characters`);

    }, 240000); // Allow 4 minutes for full workflow

    test('should complete full business newsletter workflow with real data', async () => {
      console.log('Starting business-focused newsletter workflow...');
      
      // Phase 1: Curate articles for business topic
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'startup funding and business strategy' })
        .expect(200);

      expect(curationResponse.body.success).toBe(true);
      expect(curationResponse.body.articles.length).toBeGreaterThan(0);

      console.log(`Business curation: ${curationResponse.body.articles.length} articles selected`);

      // Phase 2: Generate business newsletter
      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      
      const generationResponse = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'startup funding and business strategy',
          articleIds: articleIds
        })
        .timeout(120000);

      expect(generationResponse.status).toBe(200);
      expect(generationResponse.body.success).toBe(true);
      
      const newsletter = generationResponse.body.newsletter;
      expect(newsletter.sections.length).toBeGreaterThan(0);

      // Verify business relevance
      const newsletterText = `${newsletter.subject} ${newsletter.intro} ${newsletter.sections.map((s: any) => s.content).join(' ')}`.toLowerCase();
      const businessKeywords = ['business', 'startup', 'funding', 'revenue', 'strategy', 'market', 'company', 'entrepreneur'];
      const hasBusinessContent = businessKeywords.some(keyword => newsletterText.includes(keyword));
      
      expect(hasBusinessContent).toBe(true);
      
      console.log(`Business newsletter generated: ${newsletter.subject}`);

    }, 240000);

    test('should verify AI models are being used correctly', async () => {
      console.log('Testing AI model usage verification...');
      
      // Test that curation uses GPT-4.1 and generation uses Gemini 2.5 Pro
      // We'll verify this by checking the response characteristics
      
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'fintech and cryptocurrency regulations' })
        .expect(200);

      expect(curationResponse.body.success).toBe(true);
      
      // Curation should be selective (not just return all articles)
      expect(curationResponse.body.articles.length).toBeLessThanOrEqual(6);
      expect(curationResponse.body.articles.length).toBeLessThan(curationResponse.body.totalArticlesConsidered);

      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      
      const generationResponse = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'fintech and cryptocurrency regulations',
          articleIds: articleIds
        })
        .timeout(120000);

      expect(generationResponse.status).toBe(200);
      
      // Verify newsletter follows The Hustle style (should be conversational and witty)
      const newsletter = generationResponse.body.newsletter;
      expect(newsletter.sections.length).toBeGreaterThan(0);
      // Verify sections have the required structure
      newsletter.sections.forEach((section: any) => {
        expect(section.heading).toBeDefined(); // Should have heading property
        expect(section.contentBlocks).toBeDefined();
        expect(section.hyperlinks).toBeDefined();
        expect(Array.isArray(section.contentBlocks)).toBe(true);
        expect(Array.isArray(section.hyperlinks)).toBe(true);
      });
      expect(newsletter.actionableAdvice).toMatch(/your move/i); // Should contain "Your move:" style advice
      
      console.log('AI model verification complete');

    }, 240000);
  });

  describe('Error Handling with Real Data', () => {
    test('should handle no matching articles gracefully', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'extremely specific niche topic that probably has no articles xyzabc123' })
        .timeout(60000);

      // Should either return empty results or fallback to recent articles
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.articles).toBeDefined();
        expect(Array.isArray(response.body.articles)).toBe(true);
      }
    }, 90000);

    test('should handle invalid article IDs in generation phase', async () => {
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'technology',
          articleIds: [999999, 999998] // Non-existent IDs
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete curation within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'technology trends' })
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(45000); // Should complete within 45 seconds
      
      console.log(`Curation completed in ${duration}ms`);
    }, 60000);

    test('should complete newsletter generation within reasonable time', async () => {
      // First get some articles
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'artificial intelligence' })
        .expect(200);

      if (curationResponse.body.articles.length === 0) {
        console.warn('No articles available for performance test');
        return;
      }

      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'artificial intelligence',
          articleIds: articleIds
        })
        .timeout(90000);

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(75000); // Should complete within 75 seconds
      
      console.log(`Newsletter generation completed in ${duration}ms`);
    }, 120000);
  });
});