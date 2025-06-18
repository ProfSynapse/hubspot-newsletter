import request from 'supertest';
import express from 'express';
import { initializeDatabase, insertArticle, query } from '../common/database/postgres';
import apiRoutes from '../api/routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('Two-Phase Newsletter Generation Integration', () => {
  let testArticleIds: number[] = [];

  beforeAll(async () => {
    try {
      await initializeDatabase();
      
      // Clean up any existing test articles
      await query('DELETE FROM articles WHERE url LIKE \'%test-article%\'');
      
      // Insert comprehensive test articles
      const testArticles = [
        {
          title: 'OpenAI Releases GPT-5 with Revolutionary Capabilities',
          content: 'OpenAI has announced the release of GPT-5, featuring unprecedented language understanding and generation capabilities. The new model shows significant improvements in reasoning, code generation, and multimodal understanding. Industry experts predict this will accelerate AI adoption across enterprise applications.',
          excerpt: 'OpenAI GPT-5 brings revolutionary AI capabilities to market',
          source: 'TechCrunch',
          url: 'https://techcrunch.com/test-article-gpt5',
          author: 'Sarah Johnson',
          published_at: new Date().toISOString(),
          category: 'AI'
        },
        {
          title: 'Google AI Breakthrough in Quantum Computing Integration',
          content: 'Google researchers have achieved a major breakthrough by integrating AI algorithms with quantum computing systems. This hybrid approach promises to solve complex optimization problems that are currently intractable for classical computers.',
          excerpt: 'Google combines AI with quantum computing for breakthrough results',
          source: 'Nature',
          url: 'https://nature.com/test-article-quantum-ai',
          author: 'Dr. Michael Chen',
          published_at: new Date().toISOString(),
          category: 'AI'
        },
        {
          title: 'SaaS Companies See 40% Revenue Growth in Q4',
          content: 'The latest quarterly reports show that SaaS companies are experiencing unprecedented growth, with an average revenue increase of 40% year-over-year. This growth is driven by digital transformation initiatives and remote work adoption.',
          excerpt: 'SaaS sector shows strong Q4 performance with 40% growth',
          source: 'Forbes',
          url: 'https://forbes.com/test-article-saas-growth',
          author: 'Lisa Rodriguez',
          published_at: new Date().toISOString(),
          category: 'Business'
        },
        {
          title: 'Enterprise AI Adoption Accelerates Post-Pandemic',
          content: 'A new survey reveals that 78% of enterprises have accelerated their AI adoption plans following the pandemic. Companies are particularly focused on automation, customer service, and predictive analytics.',
          excerpt: 'Enterprise AI adoption reaches 78% post-pandemic',
          source: 'McKinsey',
          url: 'https://mckinsey.com/test-article-enterprise-ai',
          author: 'James Park',
          published_at: new Date().toISOString(),
          category: 'Business'
        },
        {
          title: 'Fintech Regulations Create New Compliance Challenges',
          content: 'New financial technology regulations are creating significant compliance challenges for fintech companies. Industry leaders are calling for clearer guidelines and more collaborative regulatory approaches.',
          excerpt: 'New fintech regulations pose compliance challenges',
          source: 'Wall Street Journal',
          url: 'https://wsj.com/test-article-fintech-regs',
          author: 'David Kim',
          published_at: new Date().toISOString(),
          category: 'Finance'
        },
        {
          title: 'Machine Learning Transforms Healthcare Diagnostics',
          content: 'Machine learning algorithms are revolutionizing healthcare diagnostics, with new studies showing 95% accuracy in early disease detection. Hospitals worldwide are implementing AI-powered diagnostic tools.',
          excerpt: 'ML achieves 95% accuracy in healthcare diagnostics',
          source: 'Medical Journal',
          url: 'https://medjournal.com/test-article-ml-healthcare',
          author: 'Dr. Emily Watson',
          published_at: new Date().toISOString(),
          category: 'Healthcare'
        },
        {
          title: 'Remote Work Technology Market Reaches $50B',
          content: 'The remote work technology market has reached a valuation of $50 billion, driven by permanent shifts in work culture. Video conferencing, collaboration tools, and cloud services are leading the growth.',
          excerpt: 'Remote work tech market hits $50B valuation',
          source: 'Business Insider',
          url: 'https://businessinsider.com/test-article-remote-work-tech',
          author: 'Mark Thompson',
          published_at: new Date().toISOString(),
          category: 'Technology'
        },
        {
          title: 'Autonomous Vehicle AI Passes Major Safety Milestone',
          content: 'Autonomous vehicle AI systems have passed a major safety milestone, completing 1 billion miles of testing without a single AI-caused accident. This achievement brings fully autonomous vehicles closer to mass deployment.',
          excerpt: 'AV AI completes 1B miles without accidents',
          source: 'IEEE Spectrum',
          url: 'https://spectrum.ieee.org/test-article-av-ai',
          author: 'Prof. Alan Roberts',
          published_at: new Date().toISOString(),
          category: 'AI'
        }
      ];

      for (const article of testArticles) {
        await insertArticle(article);
      }
      
      // Get the inserted article IDs
      const result = await query('SELECT id FROM articles WHERE url LIKE \'%test-article%\' ORDER BY id');
      testArticleIds = result.rows.map((row: any) => row.id);
      
      console.log(`Inserted ${testArticleIds.length} test articles for integration testing`);
    } catch (error) {
      console.error('Failed to set up integration test data:', error);
    }
  });

  afterAll(async () => {
    try {
      // Clean up test articles
      await query('DELETE FROM articles WHERE url LIKE \'%test-article%\'');
    } catch (error) {
      console.warn('Failed to clean up test data:', error);
    }
  });

  describe('Complete Two-Phase Workflow', () => {
    test('should complete full AI-focused newsletter generation workflow', async () => {
      // Phase 1: Curate articles for AI query
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'artificial intelligence and machine learning' })
        .expect(200);

      expect(curationResponse.body.success).toBe(true);
      expect(curationResponse.body.articles).toBeDefined();
      expect(curationResponse.body.articles.length).toBeGreaterThan(0);
      expect(curationResponse.body.totalArticlesConsidered).toBeGreaterThan(0);

      // Verify curated articles contain AI-related content
      const curatedArticles = curationResponse.body.articles;
      const aiRelatedCount = curatedArticles.filter((article: any) => 
        article.title.toLowerCase().includes('ai') || 
        article.title.toLowerCase().includes('artificial intelligence') ||
        article.title.toLowerCase().includes('machine learning') ||
        article.excerpt.toLowerCase().includes('ai')
      ).length;
      
      expect(aiRelatedCount).toBeGreaterThan(0);

      // Phase 2: Generate newsletter from curated articles
      const articleIds = curatedArticles.map((article: any) => article.id);
      
      const generationResponse = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'artificial intelligence and machine learning',
          articleIds: articleIds
        })
        .timeout(120000); // Allow 2 minutes for AI generation

      expect(generationResponse.status).toBe(200);
      expect(generationResponse.body.success).toBe(true);
      expect(generationResponse.body.newsletter).toBeDefined();
      expect(generationResponse.body.usedArticleIds).toEqual(articleIds);

      // Verify newsletter structure
      const newsletter = generationResponse.body.newsletter;
      expect(newsletter.subject).toBeDefined();
      expect(newsletter.intro).toBeDefined();
      expect(newsletter.sections).toBeDefined();
      expect(newsletter.actionableAdvice).toBeDefined();
      expect(newsletter.signoff).toBeDefined();
      expect(Array.isArray(newsletter.sections)).toBe(true);
      expect(newsletter.sections.length).toBeGreaterThan(0);

      // Verify newsletter sections
      newsletter.sections.forEach((section: any) => {
        expect(section.emoji).toBeDefined();
        expect(section.headline).toBeDefined();
        expect(section.content).toBeDefined();
        expect(section.whyItMatters).toBeDefined();
        expect(Array.isArray(section.urls)).toBe(true);
      });

      // Verify newsletter content relates to AI
      const newsletterText = `${newsletter.subject} ${newsletter.intro} ${newsletter.sections.map((s: any) => s.content).join(' ')}`.toLowerCase();
      expect(
        newsletterText.includes('ai') || 
        newsletterText.includes('artificial intelligence') || 
        newsletterText.includes('machine learning')
      ).toBe(true);

    }, 180000); // Allow 3 minutes for full workflow

    test('should complete full business-focused newsletter generation workflow', async () => {
      // Phase 1: Curate articles for business query
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'business and SaaS revenue growth' })
        .expect(200);

      expect(curationResponse.body.success).toBe(true);
      expect(curationResponse.body.articles.length).toBeGreaterThan(0);

      // Phase 2: Generate newsletter
      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      
      const generationResponse = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'business and SaaS revenue growth',
          articleIds: articleIds
        })
        .timeout(120000);

      expect(generationResponse.status).toBe(200);
      expect(generationResponse.body.success).toBe(true);
      expect(generationResponse.body.newsletter).toBeDefined();

      // Verify business relevance
      const newsletter = generationResponse.body.newsletter;
      const newsletterText = `${newsletter.subject} ${newsletter.intro} ${newsletter.sections.map((s: any) => s.content).join(' ')}`.toLowerCase();
      expect(
        newsletterText.includes('business') || 
        newsletterText.includes('saas') || 
        newsletterText.includes('revenue') ||
        newsletterText.includes('growth')
      ).toBe(true);

    }, 180000);

    test('should handle workflow with minimal articles', async () => {
      // Test with a very specific query that should return fewer articles
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'autonomous vehicle safety regulations' })
        .expect(200);

      if (curationResponse.body.articles.length === 0) {
        console.warn('No articles found for specific query, skipping minimal articles test');
        return;
      }

      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      
      const generationResponse = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'autonomous vehicle safety regulations',
          articleIds: articleIds
        })
        .timeout(120000);

      expect(generationResponse.status).toBe(200);
      expect(generationResponse.body.success).toBe(true);

    }, 180000);
  });

  describe('Error Handling in Two-Phase Workflow', () => {
    test('should handle invalid article IDs gracefully', async () => {
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'technology',
          articleIds: [99999, 99998] // Non-existent IDs
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('articles could be found');
    });

    test('should handle mixed valid and invalid article IDs', async () => {
      if (testArticleIds.length === 0) {
        console.warn('No test articles available, skipping mixed IDs test');
        return;
      }

      const mixedIds = [testArticleIds[0], 99999]; // One valid, one invalid
      
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ 
          query: 'technology',
          articleIds: mixedIds
        })
        .timeout(120000);

      // Should succeed with the valid article
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.articleCount).toBe(1);
    }, 180000);
  });

  describe('Performance and Scalability', () => {
    test('should handle maximum article curation efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'technology' })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(response.body.articles.length).toBeLessThanOrEqual(6); // Respects limit
    }, 90000);
  });
});