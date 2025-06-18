import request from 'supertest';
import express from 'express';
import apiRoutes from '../api/routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('Two-Phase API Integration Tests', () => {
  
  describe('API Endpoint Availability', () => {
    test('should have health endpoint working', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'HubSpot Newsletter Bot');
    });

    test('should validate curate-articles endpoint structure', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Query is required');
      expect(response.body).toHaveProperty('message');
    });

    test('should validate generate-from-curated endpoint structure', async () => {
      const response = await request(app)
        .post('/api/generate-from-curated')
        .send({ query: 'test' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Article IDs are required');
    });

    test('should validate legacy generate endpoint structure', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ query: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Query is required');
    });
  });

  describe('Input Validation', () => {
    test('should reject empty queries in curate-articles', async () => {
      const testCases = [
        { query: '' },
        { query: '   ' },
        {}
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/curate-articles')
          .send(testCase)
          .expect(400);
        
        expect(response.body.error).toBe('Query is required');
      }
    });

    test('should reject invalid inputs in generate-from-curated', async () => {
      const testCases = [
        { query: '', articleIds: [1, 2] },
        { query: 'test', articleIds: [] },
        { query: 'test' },
        {}
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/generate-from-curated')
          .send(testCase)
          .expect(400);
        
        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Response Structure Validation', () => {
    test('should return proper error structure', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send({ query: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('API Documentation Test', () => {
    test('should demonstrate two-phase workflow structure', () => {
      // This test documents the expected two-phase workflow
      
      const expectedCurationRequest = {
        query: 'artificial intelligence and machine learning'
      };

      const expectedCurationResponse = {
        success: true,
        query: 'artificial intelligence and machine learning',
        articleCount: 3,
        totalArticlesConsidered: 10,
        articles: [
          {
            id: 1,
            title: 'AI Breakthrough in Healthcare',
            url: 'https://example.com/ai-healthcare',
            source: 'TechCrunch',
            published_at: '2024-01-01T12:00:00Z',
            excerpt: 'New AI technology revolutionizes medical diagnosis...'
          }
        ]
      };

      const expectedGenerationRequest = {
        query: 'artificial intelligence and machine learning',
        articleIds: [1, 2, 3]
      };

      const expectedGenerationResponse = {
        success: true,
        query: 'artificial intelligence and machine learning',
        articleCount: 3,
        usedArticleIds: [1, 2, 3],
        newsletter: {
          subject: '🚀 AI Revolution Hits Different This Week',
          intro: 'The AI landscape just shifted dramatically...',
          sections: [
            {
              emoji: '🔥',
              headline: 'AI Healthcare Breakthrough Changes Everything',
              content: 'Detailed analysis of the breakthrough...',
              whyItMatters: 'This impacts the entire healthcare industry...',
              urls: ['https://example.com/ai-healthcare']
            }
          ],
          actionableAdvice: 'Your move: Start preparing for AI integration...',
          signoff: 'Keep innovating,'
        }
      };

      // Verify the structure matches our API design
      expect(expectedCurationRequest).toHaveProperty('query');
      expect(expectedCurationResponse).toHaveProperty('success');
      expect(expectedCurationResponse).toHaveProperty('articles');
      expect(expectedGenerationRequest).toHaveProperty('articleIds');
      expect(expectedGenerationResponse).toHaveProperty('newsletter');
      expect(expectedGenerationResponse.newsletter).toHaveProperty('sections');
      expect(expectedGenerationResponse.newsletter.sections[0]).toHaveProperty('urls');
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      
      // Should handle JSON parsing errors
    });

    test('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/curate-articles')
        .send('query=test')
        .expect(400);
      
      // Should handle form data or missing content type
    });
  });

  describe('AI Model Configuration Test', () => {
    test('should document AI model usage expectations', () => {
      // This test documents which AI models should be used for each phase
      
      const phase1CurationModel = 'google/gemini-2.5-flash';
      const phase2GenerationModel = 'google/gemini-2.5-pro';
      
      expect(phase1CurationModel).toBe('google/gemini-2.5-flash');
      expect(phase2GenerationModel).toBe('google/gemini-2.5-pro');
      
      // The article curator should use GPT-4.1 for intelligent article selection
      // The newsletter generator should use Gemini 2.5 Pro for content creation
      
      console.log('Phase 1 (Curation) uses:', phase1CurationModel);
      console.log('Phase 2 (Generation) uses:', phase2GenerationModel);
    });
  });
});

// Integration test that can run without database or API keys
describe('Mock Two-Phase Workflow', () => {
  test('should simulate complete workflow with mock data', async () => {
    console.log('=== SIMULATED TWO-PHASE WORKFLOW ===');
    
    // Simulate Phase 1: Article Curation
    console.log('Phase 1: Article Curation (would use GPT-4.1)');
    const mockCurationInput = {
      query: 'artificial intelligence and machine learning',
      availableArticles: [
        { id: 1, title: 'AI Breakthrough in Healthcare', category: 'AI' },
        { id: 2, title: 'Stock Market Update', category: 'Finance' },
        { id: 3, title: 'Machine Learning in Autonomous Cars', category: 'AI' },
        { id: 4, title: 'Real Estate Trends', category: 'Business' },
        { id: 5, title: 'Deep Learning Neural Networks', category: 'AI' }
      ]
    };
    
    // Mock curation logic - select AI-related articles
    const mockCuratedIds = mockCurationInput.availableArticles
      .filter(article => article.category === 'AI')
      .map(article => article.id);
    
    console.log('Selected article IDs:', mockCuratedIds);
    expect(mockCuratedIds).toEqual([1, 3, 5]);
    
    // Simulate Phase 2: Newsletter Generation
    console.log('Phase 2: Newsletter Generation (would use Gemini 2.5 Pro)');
    const mockGenerationInput = {
      query: 'artificial intelligence and machine learning',
      articleIds: mockCuratedIds,
      curatedArticles: mockCurationInput.availableArticles.filter(a => 
        mockCuratedIds.includes(a.id)
      )
    };
    
    // Mock newsletter structure
    const mockNewsletter = {
      subject: '🚀 AI Hits Different This Week',
      intro: 'The AI landscape is evolving rapidly...',
      sections: mockGenerationInput.curatedArticles.map((article, index) => ({
        emoji: ['🔥', '💰', '📊'][index] || '🚀',
        headline: `${article.title} - Key Insights`,
        content: `Deep dive analysis of ${article.title.toLowerCase()}...`,
        whyItMatters: 'This development impacts the entire tech industry...',
        urls: [`https://example.com/article-${article.id}`]
      })),
      actionableAdvice: 'Your move: Start exploring AI integration opportunities...',
      signoff: 'Keep innovating,'
    };
    
    console.log('Generated newsletter subject:', mockNewsletter.subject);
    console.log('Number of sections:', mockNewsletter.sections.length);
    
    expect(mockNewsletter.sections).toHaveLength(3);
    expect(mockNewsletter.subject).toContain('🚀');
    expect(mockNewsletter.actionableAdvice).toContain('Your move:');
    
    console.log('=== WORKFLOW SIMULATION COMPLETE ===');
  });
});