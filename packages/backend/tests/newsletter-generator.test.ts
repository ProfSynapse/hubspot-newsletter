import { generateNewsletter } from '../ai/newsletter-generator';
import { Article } from '../../common/database/sqlite';

describe('Newsletter Generator', () => {
  const sampleArticles: Article[] = [
    {
      title: 'AI Startup Raises $50M in Series A Funding',
      excerpt: 'A new AI company focused on business automation has raised significant funding from venture capitalists.',
      source: 'TechCrunch',
      url: 'https://example.com/ai-funding',
      published_at: new Date().toISOString()
    },
    {
      title: 'SaaS Pricing Strategies That Actually Work',
      excerpt: 'How modern SaaS companies are optimizing their pricing models for maximum revenue growth.',
      source: 'Business Insider',
      url: 'https://example.com/saas-pricing',
      published_at: new Date().toISOString()
    },
    {
      title: 'Remote Work Productivity Trends in 2024',
      excerpt: 'New research shows surprising insights about remote work effectiveness and team collaboration.',
      source: 'Harvard Business Review',
      url: 'https://example.com/remote-work',
      published_at: new Date().toISOString()
    }
  ];

  test('should generate newsletter with valid structure', async () => {
    const query = 'AI startup funding';
    
    const newsletter = await generateNewsletter(query, sampleArticles);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('intro');
    expect(newsletter).toHaveProperty('sections');
    expect(newsletter).toHaveProperty('actionableAdvice');
    expect(newsletter).toHaveProperty('signoff');
    
    expect(typeof newsletter.subject).toBe('string');
    expect(newsletter.subject.length).toBeGreaterThan(0);
    
    expect(Array.isArray(newsletter.sections)).toBe(true);
    expect(newsletter.sections.length).toBeGreaterThan(0);
  }, 30000);

  test('should handle different query types', async () => {
    const queries = [
      'SaaS pricing strategies',
      'remote work trends',
      'marketing automation'
    ];
    
    for (const query of queries) {
      const newsletter = await generateNewsletter(query, sampleArticles);
      
      expect(newsletter.sections.length).toBeGreaterThan(0);
    }
  }, 45000);

  test('should generate fallback newsletter when AI fails', async () => {
    // Test with empty API key to trigger fallback
    const originalKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = '';
    
    const newsletter = await generateNewsletter('test query', sampleArticles);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('sections');
    expect(newsletter.sections.length).toBeGreaterThan(0);
    
    // Restore original key
    process.env.OPENROUTER_API_KEY = originalKey;
  });

  test('should validate newsletter section structure', async () => {
    const newsletter = await generateNewsletter('business automation', sampleArticles);
    
    newsletter.sections.forEach(section => {
      expect(section).toHaveProperty('emoji');
      expect(section).toHaveProperty('headline');
      expect(section).toHaveProperty('content');
      expect(section).toHaveProperty('whyItMatters');
      
      expect(typeof section.emoji).toBe('string');
      expect(typeof section.headline).toBe('string');
      expect(typeof section.content).toBe('string');
      expect(typeof section.whyItMatters).toBe('string');
    });
  }, 30000);

  test('should handle empty articles array', async () => {
    const newsletter = await generateNewsletter('test query', []);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('sections');
    expect(Array.isArray(newsletter.sections)).toBe(true);
  });

  test('should make real API call to OpenRouter if API key provided', async () => {
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('Skipping real API test - no API key provided');
      return;
    }

    console.log('Making real API call to OpenRouter...');
    const newsletter = await generateNewsletter('AI business automation', sampleArticles);
    
    expect(newsletter).toHaveProperty('subject');
    expect(newsletter).toHaveProperty('sections');
    expect(newsletter.sections.length).toBeGreaterThan(0);
    
    console.log('Generated newsletter subject:', newsletter.subject);
    console.log('Number of sections:', newsletter.sections.length);
  }, 45000);
});