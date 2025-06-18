import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { Article } from '../database/sqlite';

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

export async function scrapeFullContent(article: Article): Promise<Article> {
  try {
    // Skip if we already have substantial content
    if (article.content && article.content.length > 500) {
      return article;
    }
    
    console.log(`Scraping full content for: ${article.title}`);
    const response = await axiosInstance.get(article.url);
    
    // Try Readability first for clean article extraction
    try {
      const dom = new JSDOM(response.data, { url: article.url });
      const reader = new Readability(dom.window.document);
      const parsed = reader.parse();
      
      if (parsed && parsed.textContent) {
        article.content = parsed.textContent.substring(0, 5000); // Limit to 5000 chars
        article.excerpt = parsed.excerpt || article.excerpt;
        return article;
      }
    } catch (readabilityError) {
      console.log('Readability failed, falling back to Cheerio');
    }
    
    // Fallback to Cheerio for basic extraction
    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Try common article selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.content',
      'main'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) break;
      }
    }
    
    // If still no content, get meta description
    if (!content || content.length < 200) {
      content = $('meta[property="og:description"]').attr('content') || 
                $('meta[name="description"]').attr('content') || 
                article.excerpt || '';
    }
    
    article.content = content.substring(0, 5000);
    return article;
    
  } catch (error) {
    console.error(`Error scraping content for ${article.url}:`, error);
    // Return article with original excerpt as content
    article.content = article.excerpt;
    return article;
  }
}

export async function scrapeArticles(articles: Article[]): Promise<Article[]> {
  const scrapedArticles: Article[] = [];
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    const batchPromises = batch.map(article => 
      scrapeFullContent(article).catch(err => {
        console.error(`Failed to scrape ${article.url}:`, err);
        return article; // Return original on error
      })
    );
    
    const results = await Promise.all(batchPromises);
    scrapedArticles.push(...results);
    
    // Rate limiting between batches
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return scrapedArticles;
}