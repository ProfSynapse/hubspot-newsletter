import { curateArticles } from '../ai/article-curator';
import { Article } from '../common/database/postgres';

describe('Article Curator', () => {
  const mockArticles: Article[] = [
    {
      id: 1,
      title: 'AI Startup Raises $50M Series A',
      content: 'A new AI startup focused on enterprise automation has raised $50 million in Series A funding. The company plans to use the funds to expand their machine learning capabilities and hire more engineers.',
      excerpt: 'AI startup raises $50M for enterprise automation solutions',
      source: 'TechCrunch',
      url: 'https://techcrunch.com/ai-startup-50m',
      author: 'Sarah Johnson',
      published_at: new Date().toISOString(),
      category: 'AI'
    },
    {
      id: 2,
      title: 'Machine Learning in Healthcare Shows Promise',
      content: 'Recent studies show that machine learning algorithms are improving diagnostic accuracy in healthcare settings. Hospitals are beginning to adopt AI-powered tools for better patient outcomes.',
      excerpt: 'ML algorithms improving healthcare diagnostics',
      source: 'Medical News',
      url: 'https://medicalnews.com/ml-healthcare',
      author: 'Dr. Emily Chen',
      published_at: new Date().toISOString(),
      category: 'Healthcare'
    },
    {
      id: 3,
      title: 'SaaS Revenue Growth Strategies for 2024',
      content: 'SaaS companies are implementing new strategies to drive revenue growth in the competitive market. Key approaches include customer retention, upselling, and market expansion.',
      excerpt: 'New SaaS revenue strategies emerging for 2024',
      source: 'Forbes',
      url: 'https://forbes.com/saas-revenue-2024',
      author: 'Mike Chen',
      published_at: new Date().toISOString(),
      category: 'Business'
    },
    {
      id: 4,
      title: 'Remote Work Trends Shift Post-Pandemic',
      content: 'Companies are adapting their remote work policies as the pandemic effects stabilize. Many organizations are finding hybrid models most effective.',
      excerpt: 'Remote work policies evolving in post-pandemic era',
      source: 'Bloomberg',
      url: 'https://bloomberg.com/remote-work-trends',
      author: 'Lisa Rodriguez',
      published_at: new Date().toISOString(),
      category: 'Business'
    },
    {
      id: 5,
      title: 'Deep Learning Breakthroughs in Computer Vision',
      content: 'Recent advances in deep learning are revolutionizing computer vision applications. New models show unprecedented accuracy in image recognition tasks.',
      excerpt: 'Deep learning advances in computer vision',
      source: 'AI Research Journal',
      url: 'https://airesearch.com/deep-learning-cv',
      author: 'Prof. Alan Kim',
      published_at: new Date().toISOString(),
      category: 'AI'
    },
    {
      id: 6,
      title: 'Cryptocurrency Market Volatility Continues',
      content: 'The cryptocurrency market continues to experience high volatility as regulatory uncertainty persists. Investors are cautioned about the risks.',
      excerpt: 'Crypto market remains volatile amid regulations',
      source: 'CoinDesk',
      url: 'https://coindesk.com/crypto-volatility',
      author: 'Mark Thompson',
      published_at: new Date().toISOString(),
      category: 'Finance'
    },
    {
      id: 7,
      title: 'Neural Networks Improve Natural Language Processing',
      content: 'Advanced neural network architectures are making significant improvements in natural language processing tasks, enabling better chatbots and translation services.',
      excerpt: 'Neural networks advancing NLP capabilities',
      source: 'Tech Review',
      url: 'https://techreview.com/neural-nlp',
      author: 'Jennifer Wu',
      published_at: new Date().toISOString(),
      category: 'AI'
    }
  ];

  describe('curateArticles', () => {
    test('should return no relevant articles for empty array', async () => {
      const result = await curateArticles('AI', []);
      expect(result.hasRelevantArticles).toBe(false);
      expect(result.articleIds).toEqual([]);
      expect(result.reasoning).toBeTruthy();
    });

    test('should curate AI-related articles', async () => {
      // This test will actually call the OpenAI API
      const result = await curateArticles('artificial intelligence and machine learning', mockArticles);
      
      expect(result.hasRelevantArticles).toBe(true);
      expect(Array.isArray(result.articleIds)).toBe(true);
      expect(result.articleIds.length).toBeGreaterThan(0);
      expect(result.articleIds.length).toBeLessThanOrEqual(6);
      expect(result.reasoning).toBeTruthy();
      
      // Verify all returned IDs exist in the original articles
      const originalIds = mockArticles.map(article => article.id!);
      result.articleIds.forEach((id: number) => {
        expect(originalIds).toContain(id);
      });
      
      // Should prefer AI-related articles
      const aiArticleIds = mockArticles
        .filter(article => article.category === 'AI' || article.title.toLowerCase().includes('ai') || (article.content && article.content.toLowerCase().includes('artificial intelligence')))
        .map(article => article.id!);
      
      const selectedAiArticles = result.articleIds.filter((id: number) => aiArticleIds.includes(id));
      expect(selectedAiArticles.length).toBeGreaterThan(0);
    }, 30000); // Allow time for AI API call

    test('should curate business-related articles', async () => {
      // This test will actually call the OpenAI API
      const result = await curateArticles('business and SaaS', mockArticles);
      
      expect(result.hasRelevantArticles).toBe(true);
      expect(Array.isArray(result.articleIds)).toBe(true);
      expect(result.articleIds.length).toBeGreaterThan(0);
      expect(result.articleIds.length).toBeLessThanOrEqual(6);
      expect(result.reasoning).toBeTruthy();
      
      // Verify all returned IDs exist in the original articles
      const originalIds = mockArticles.map(article => article.id!);
      result.articleIds.forEach((id: number) => {
        expect(originalIds).toContain(id);
      });
      
      // Should prefer business-related articles
      const businessArticleIds = mockArticles
        .filter(article => article.category === 'Business' || article.title.toLowerCase().includes('saas') || (article.content && article.content.toLowerCase().includes('business')))
        .map(article => article.id!);
      
      const selectedBusinessArticles = result.articleIds.filter((id: number) => businessArticleIds.includes(id));
      expect(selectedBusinessArticles.length).toBeGreaterThan(0);
    }, 30000); // Allow time for AI API call

    test('should return no relevant articles for unrelated query', async () => {
      // Test with a query that should have no relevant articles
      const result = await curateArticles('quantum computing and underwater basket weaving', mockArticles);
      
      // The AI should recognize no articles are relevant
      expect(result.hasRelevantArticles).toBe(false);
      expect(result.articleIds).toEqual([]);
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.toLowerCase()).toContain('no');
    }, 30000);

    test('should respect the 6 article limit', async () => {
      const result = await curateArticles('technology', mockArticles);
      
      if (result.hasRelevantArticles) {
        expect(result.articleIds.length).toBeLessThanOrEqual(6);
      }
    }, 30000);

    test('should handle articles without content gracefully', async () => {
      const articlesWithoutContent = mockArticles.map(article => ({
        ...article,
        content: undefined
      }));
      
      const result = await curateArticles('AI', articlesWithoutContent);
      
      // Should still work with excerpts
      expect(result.hasRelevantArticles).toBe(true);
      expect(Array.isArray(result.articleIds)).toBe(true);
      expect(result.articleIds.length).toBeGreaterThan(0);
    }, 30000);
  });
});