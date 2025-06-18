import { Router, Request, Response } from 'express';
import { searchArticles, getRecentArticles } from '../common/database/postgres';
import { generateNewsletter } from '../ai/newsletter-generator';

const router = Router();

interface GenerateNewsletterRequest {
  query: string;
}

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'HubSpot Newsletter Bot'
  });
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { query } = req.body as GenerateNewsletterRequest;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query is required',
        message: 'Please provide a topic or interest for your newsletter'
      });
    }

    console.log(`Generating newsletter for query: ${query}`);
    
    let articles = await searchArticles(query);
    
    if (articles.length < 5) {
      const recentArticles = await getRecentArticles(24);
      articles = [...articles, ...recentArticles].slice(0, 10);
    }
    
    if (articles.length === 0) {
      return res.status(404).json({ 
        error: 'No articles found',
        message: 'No recent articles available. Please try again later.'
      });
    }

    const newsletter = await generateNewsletter(query, articles);
    
    res.json({
      success: true,
      query,
      articleCount: articles.length,
      newsletter
    });
    
  } catch (error) {
    console.error('Error generating newsletter:', error);
    res.status(500).json({ 
      error: 'Failed to generate newsletter',
      message: 'An error occurred while generating your newsletter. Please try again.'
    });
  }
});

export default router;