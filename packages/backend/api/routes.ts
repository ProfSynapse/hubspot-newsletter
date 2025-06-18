import { Router, Request, Response } from 'express';
import { searchArticles, getRecentArticles, getArticlesByIds } from '../common/database/postgres';
import { generateNewsletter } from '../ai/newsletter-generator';
import { curateArticles } from '../ai/article-curator';

const router = Router();

interface GenerateNewsletterRequest {
  query: string;
}

interface CurateArticlesRequest {
  query: string;
}

interface CuratedArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string;
  excerpt: string;
}

interface GenerateFromCuratedRequest {
  query: string;
  articleIds: number[];
}

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'HubSpot Newsletter Bot'
  });
});

// Phase 1: Curate articles (returns URLs and IDs)
router.post('/curate-articles', async (req: Request, res: Response) => {
  try {
    const { query } = req.body as CurateArticlesRequest;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query is required',
        message: 'Please provide a topic or interest for article curation'
      });
    }

    console.log(`Curating articles for query: ${query}`);
    
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

    // Use AI to curate the most relevant articles
    const curatedArticleIds = await curateArticles(query, articles);
    const curatedArticlesList = articles.filter(article => curatedArticleIds.includes(article.id!));

    const curatedArticles: CuratedArticle[] = curatedArticlesList.map(article => ({
      id: article.id!,
      title: article.title,
      url: article.url,
      source: article.source,
      published_at: article.published_at || '',
      excerpt: article.excerpt || article.content?.substring(0, 200) || ''
    }));
    
    res.json({
      success: true,
      query,
      articleCount: curatedArticles.length,
      totalArticlesConsidered: articles.length,
      articles: curatedArticles
    });
    
  } catch (error) {
    console.error('Error curating articles:', error);
    res.status(500).json({ 
      error: 'Failed to curate articles',
      message: 'An error occurred while curating articles. Please try again.'
    });
  }
});

// Phase 2: Generate newsletter from curated articles
router.post('/generate-from-curated', async (req: Request, res: Response) => {
  try {
    const { query, articleIds } = req.body as GenerateFromCuratedRequest;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query is required',
        message: 'Please provide a topic or interest for your newsletter'
      });
    }

    if (!articleIds || articleIds.length === 0) {
      return res.status(400).json({ 
        error: 'Article IDs are required',
        message: 'Please provide at least one article ID for newsletter generation'
      });
    }

    console.log(`Generating newsletter for query: ${query} with ${articleIds.length} curated articles`);
    
    const articles = await getArticlesByIds(articleIds);
    
    if (articles.length === 0) {
      return res.status(404).json({ 
        error: 'No articles found',
        message: 'None of the specified articles could be found in the database.'
      });
    }

    const newsletter = await generateNewsletter(query, articles);
    
    res.json({
      success: true,
      query,
      articleCount: articles.length,
      usedArticleIds: articleIds,
      newsletter
    });
    
  } catch (error) {
    console.error('Error generating newsletter from curated articles:', error);
    res.status(500).json({ 
      error: 'Failed to generate newsletter',
      message: 'An error occurred while generating your newsletter. Please try again.'
    });
  }
});

// Legacy endpoint (backwards compatibility)
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