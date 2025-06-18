import request from 'supertest';
import express from 'express';
import { initializeDatabase, insertArticle } from '../common/database/postgres';
import apiRoutes from '../api/routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  beforeAll(async () => {
    try {
      await initializeDatabase();
      
      // Insert test articles for testing
      const testArticles = [
        {
          title: 'AI Startup Raises $50M Series A',
          content: 'A new AI startup focused on enterprise automation has raised $50 million in Series A funding...',
          excerpt: 'AI startup raises $50M for enterprise automation solutions',
          source: 'TechCrunch',
          url: 'https://techcrunch.com/ai-startup-50m',
          author: 'Sarah Johnson',
          published_at: new Date().toISOString(),
          category: 'AI'
        },
        {
          title: 'SaaS Revenue Growth Strategies for 2024',
          content: 'SaaS companies are implementing new strategies to drive revenue growth in the competitive market...',
          excerpt: 'New SaaS revenue strategies emerging for 2024',
          source: 'Forbes',
          url: 'https://forbes.com/saas-revenue-2024',
          author: 'Mike Chen',
          published_at: new Date().toISOString(),
          category: 'Business'
        },
        {
          title: 'Remote Work Trends Shift Post-Pandemic',
          content: 'Companies are adapting their remote work policies as the pandemic effects stabilize...',
          excerpt: 'Remote work policies evolving in post-pandemic era',
          source: 'Bloomberg',
          url: 'https://bloomberg.com/remote-work-trends',
          author: 'Lisa Rodriguez',
          published_at: new Date().toISOString(),
          category: 'Business'
        },
        {
          title: 'Fintech Regulations Tighten Globally',
          content: 'Governments worldwide are implementing stricter regulations on fintech companies...',
          excerpt: 'Global fintech regulations becoming more stringent',
          source: 'Wall Street Journal',
          url: 'https://wsj.com/fintech-regulations',
          author: 'David Park',
          published_at: new Date().toISOString(),
          category: 'Finance'
        }
      ];

      for (const article of testArticles) {
        await insertArticle(article);
      }
    } catch (error) {
      console.warn('Test database setup failed, some tests may fail:', error);
    }
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
    });
  });

  describe('POST /api/curate-articles', () => {
    test('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should curate articles successfully for AI query', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'AI' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('query', 'AI');
      expect(response.body).toHaveProperty('articles');
      expect(response.body).toHaveProperty('articleCount');
      expect(response.body).toHaveProperty('totalArticlesConsidered');
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      if (response.body.articles.length > 0) {
        const article = response.body.articles[0];
        expect(article).toHaveProperty('id');
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('published_at');
        expect(article).toHaveProperty('excerpt');
      }
    });

    test('should curate articles successfully for business query', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'business' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('articles');
      expect(Array.isArray(response.body.articles)).toBe(true);
    });
  });

  describe('POST /api/generate-from-curated', () => {
    test('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ query: '', articleIds: [1, 2] })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for missing articleIds', async () => {
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ query: 'AI' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for empty articleIds array', async () => {
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ query: 'AI', articleIds: [] })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should generate newsletter from curated articles', async () => {
      // First curate articles
      const curationResponse = await request(app)
        .post('/api/curate-articles')
        .send({ query: 'AI' })
        .expect(200);
      
      if (curationResponse.body.articles.length === 0) {
        console.warn('No articles found for AI query, skipping newsletter generation test');
        return;
      }

      const articleIds = curationResponse.body.articles.map((article: any) => article.id);
      
      // Then generate newsletter (this will actually call the AI service)
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ query: 'AI', articleIds })
        .timeout(60000); // Allow more time for AI generation
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('query', 'AI');
      expect(response.body).toHaveProperty('newsletter');
      expect(response.body).toHaveProperty('articleCount');
      expect(response.body).toHaveProperty('usedArticleIds');
      
      const newsletter = response.body.newsletter;
      expect(newsletter).toHaveProperty('subject');
      expect(newsletter).toHaveProperty('intro');
      expect(newsletter).toHaveProperty('sections');
      expect(newsletter).toHaveProperty('actionableAdvice');
      expect(newsletter).toHaveProperty('signoff');
      expect(Array.isArray(newsletter.sections)).toBe(true);
      
      if (newsletter.sections.length > 0) {
        const section = newsletter.sections[0];
        expect(section).toHaveProperty('emoji');
        expect(section).toHaveProperty('headline');
        expect(section).toHaveProperty('content');
        expect(section).toHaveProperty('whyItMatters');
        expect(section).toHaveProperty('urls');
        expect(Array.isArray(section.urls)).toBe(true);
      }
    }, 90000); // Allow 90 seconds for AI generation
  });

  describe('POST /api/generate (legacy)', () => {
    test('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ query: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should generate newsletter using legacy endpoint', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ query: 'business' })
        .timeout(60000);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('newsletter');
    }, 90000); // Allow 90 seconds for AI generation
  });
});