import { generateNewsletter } from '../ai/newsletter-generator';
import { Article } from '../common/database/postgres';
import axios from 'axios';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Newsletter Generator', () => {
  const sampleArticles: Article[] = [
    {
      title: 'AI Startup Raises $50M in Series A Funding',
      excerpt: 'A new AI company focused on business automation has raised significant funding from venture capitalists.',
      source: 'TechCrunch',
      url: 'https://example.com/ai-funding',
      published_at: new Date().toISOString(),
      images: [
        {
          url: 'https://example.com/ai-startup-image.jpg',
          alt: 'AI startup team photo'
        }
      ]
    },
    {
      title: 'SaaS Pricing Strategies That Actually Work',
      excerpt: 'How modern SaaS companies are optimizing their pricing models for maximum revenue growth.',
      source: 'Business Insider',
      url: 'https://example.com/saas-pricing',
      published_at: new Date().toISOString(),
      images: [
        {
          url: 'https://example.com/saas-pricing-chart.jpg',
          alt: 'SaaS pricing strategies chart'
        }
      ]
    },
    {
      title: 'Remote Work Productivity Trends in 2024',
      excerpt: 'New research shows surprising insights about remote work effectiveness and team collaboration.',
      source: 'Harvard Business Review',
      url: 'https://example.com/remote-work',
      published_at: new Date().toISOString()
    }
  ];

  const mockNewsletterResponse = {
    subject: '🤖 The AI Automation Revolution',
    theming: {
      overallTheme: 'AI-driven business transformation across industries',
      strategy: 'Connect AI funding to practical SaaS applications and remote work productivity',
      angle: 'Optimistic yet practical'
    },
    thematicIntro: 'AI is reshaping how businesses operate, from automation to pricing strategies.',
    featuredImage: {
      url: 'https://example.com/ai-startup-image.jpg',
      caption: 'AI startup team celebrating funding round',
      source: 'TechCrunch'
    },
    sections: [
      {
        heading: 'The AI Funding Boom',
        contentBlocks: [
          {
            type: 'paragraph',
            content: 'Venture capitalists are pouring money into AI startups.',
            hyperlinks: [
              {
                linkText: 'AI Startup Raises $50M',
                url: 'https://example.com/ai-funding'
              }
            ]
          }
        ]
      }
    ],
    actionableAdvice: 'Evaluate AI tools for your business processes',
    signoff: 'Stay innovative,\n\nThe Hustle Team'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set a mock API key for tests
    process.env.OPENROUTER_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate newsletter with valid structure', async () => {
    const query = 'AI startup funding';
    
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(mockNewsletterResponse)
          }
        }]
      }
    });
    
    const newsletter = await generateNewsletter(query, sampleArticles);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('theming');
    expect(newsletter).toHaveProperty('thematicIntro');
    expect(newsletter).toHaveProperty('featuredImage');
    expect(newsletter).toHaveProperty('sections');
    expect(newsletter).toHaveProperty('actionableAdvice');
    expect(newsletter).toHaveProperty('signoff');
    
    expect(typeof newsletter.subject).toBe('string');
    expect(newsletter.subject.length).toBeGreaterThan(0);
    
    expect(newsletter.theming).toHaveProperty('overallTheme');
    expect(newsletter.theming).toHaveProperty('strategy');
    expect(newsletter.theming).toHaveProperty('angle');
    
    expect(newsletter.featuredImage).toHaveProperty('url');
    expect(newsletter.featuredImage).toHaveProperty('caption');
    expect(newsletter.featuredImage).toHaveProperty('source');
    
    expect(Array.isArray(newsletter.sections)).toBe(true);
    expect(newsletter.sections.length).toBeGreaterThan(0);
    
    // Check that sources are automatically added from the articles
    expect(newsletter).toHaveProperty('sources');
    expect(Array.isArray(newsletter.sources)).toBe(true);
    expect(newsletter.sources.length).toBe(sampleArticles.length);
    expect(newsletter.sources[0]).toHaveProperty('title');
    expect(newsletter.sources[0]).toHaveProperty('url');
    expect(newsletter.sources[0]).toHaveProperty('source');
  }, 30000);

  test('should handle different query types', async () => {
    const queries = [
      'SaaS pricing strategies',
      'remote work trends',
      'marketing automation'
    ];
    
    for (const query of queries) {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{
            message: {
              content: JSON.stringify(mockNewsletterResponse)
            }
          }]
        }
      });
      
      const newsletter = await generateNewsletter(query, sampleArticles);
      
      expect(newsletter.sections.length).toBeGreaterThan(0);
    }
  }, 45000);

  test('should retry on validation failure and eventually throw', async () => {
    // Mock a response without required fields to trigger validation failure
    const invalidResponse = {
      ...mockNewsletterResponse,
      featuredImage: undefined // Missing required field
    };
    
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(invalidResponse)
          }
        }]
      }
    });
    
    await expect(generateNewsletter('test query', sampleArticles)).rejects.toThrow();
    
    // Should have retried 3 times
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  test('should validate newsletter section structure', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(mockNewsletterResponse)
          }
        }]
      }
    });
    
    const newsletter = await generateNewsletter('business automation', sampleArticles);
    
    newsletter.sections.forEach(section => {
      expect(section).toHaveProperty('heading');
      expect(section).toHaveProperty('contentBlocks');
      
      expect(typeof section.heading).toBe('string');
      expect(Array.isArray(section.contentBlocks)).toBe(true);
      
      // Validate at least one content block has hyperlinks
      const hasHyperlinks = section.contentBlocks.some(block => 
        block.hyperlinks && block.hyperlinks.length > 0
      );
      expect(hasHyperlinks).toBe(true);
      
      section.contentBlocks.forEach(block => {
        expect(block).toHaveProperty('type');
        expect(['paragraph', 'bulletList']).toContain(block.type);
        
        if (block.type === 'paragraph') {
          expect(block).toHaveProperty('content');
          expect(typeof block.content).toBe('string');
        } else if (block.type === 'bulletList') {
          expect(block).toHaveProperty('items');
          expect(Array.isArray(block.items)).toBe(true);
        }
        
        if (block.hyperlinks) {
          expect(Array.isArray(block.hyperlinks)).toBe(true);
          block.hyperlinks.forEach(link => {
            expect(link).toHaveProperty('linkText');
            expect(link).toHaveProperty('url');
            expect(typeof link.linkText).toBe('string');
            expect(typeof link.url).toBe('string');
          });
        }
      });
    });
  }, 30000);

  test('should handle empty articles array', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(mockNewsletterResponse)
          }
        }]
      }
    });
    
    const newsletter = await generateNewsletter('test query', []);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('sections');
    expect(Array.isArray(newsletter.sections)).toBe(true);
  });

  test('should retry when content blocks lack hyperlinks', async () => {
    // Mock a response without hyperlinks in content blocks
    const responseWithoutHyperlinks = {
      ...mockNewsletterResponse,
      sections: [{
        heading: 'Section without links',
        contentBlocks: [{
          type: 'paragraph',
          content: 'Some content'
          // No hyperlinks property
        }]
      }]
    };
    
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(responseWithoutHyperlinks)
          }
        }]
      }
    });
    
    await expect(generateNewsletter('test query', sampleArticles)).rejects.toThrow();
    
    // Should have retried 3 times
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  test('should make real API call to OpenRouter if API key provided', async () => {
    // Only run this test if explicitly enabled
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'test-api-key') {
      console.log('Skipping real API test - no real API key provided');
      return;
    }

    // Clear mocks for real API call
    jest.unmock('axios');
    const realAxios = require('axios').default;
    
    console.log('Making real API call to OpenRouter...');
    const newsletter = await generateNewsletter('AI business automation', sampleArticles);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('sections');
    expect(newsletter.sections.length).toBeGreaterThan(0);
    
    console.log('Generated newsletter subject:', newsletter.subject);
    console.log('Number of sections:', newsletter.sections.length);
  }, 45000);
});