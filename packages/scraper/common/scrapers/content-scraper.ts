import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { Article, ArticleImage } from '../database/postgres';

// Increase Node.js header size limit
process.env.NODE_OPTIONS = '--max-http-header-size=81920';

const axiosInstance = axios.create({
  timeout: 15000,
  maxRedirects: 3,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  },
  // Don't throw on 4xx/5xx status codes
  validateStatus: (status) => status < 500
});

function extractImages(html: string, baseUrl: string): ArticleImage[] {
  const $ = cheerio.load(html);
  const images: ArticleImage[] = [];
  
  // Priority order for meta image extraction
  const metaImageSelectors = [
    { selector: 'meta[property="og:image"]', attr: 'content' },
    { selector: 'meta[property="og:image:url"]', attr: 'content' },
    { selector: 'meta[name="twitter:image"]', attr: 'content' },
    { selector: 'meta[name="twitter:image:src"]', attr: 'content' },
    { selector: 'meta[property="article:image"]', attr: 'content' },
    { selector: 'link[rel="image_src"]', attr: 'href' }
  ];
  
  // Try meta tags first (most reliable)
  for (const { selector, attr } of metaImageSelectors) {
    const imageUrl = $(selector).attr(attr);
    if (imageUrl) {
      const absoluteUrl = makeAbsoluteUrl(imageUrl, baseUrl);
      if (absoluteUrl) {
        images.push({
          url: absoluteUrl,
          alt: $('meta[property="og:image:alt"]').attr('content') || 
               $('meta[name="twitter:image:alt"]').attr('content') || 
               undefined
        });
        break; // Only take the first meta image
      }
    }
  }
  
  // Extract article images with alt text - be more aggressive
  const articleImageSelectors = [
    'article img',
    '.post-content img',
    '.entry-content img',
    '.content img',
    'main img',
    '.story-body img',
    '.article-body img',
    '.news-content img',
    '.body img',
    'img' // Fallback to all images if nothing else works
  ];
  
  for (const selector of articleImageSelectors) {
    $(selector).each((_, element) => {
      const $img = $(element);
      const alt = $img.attr('alt') || $img.attr('title') || '';
      let src = '';
      
      // Priority order: srcset (highest quality) > data-srcset > src > data-src
      const srcset = $img.attr('srcset');
      const dataSrcset = $img.attr('data-srcset');
      const regularSrc = $img.attr('src');
      const dataSrc = $img.attr('data-src') || $img.attr('data-lazy-src');
      
      // Try srcset first (usually has highest quality images)
      if (srcset) {
        const srcsetUrls = srcset.split(',').map(s => s.trim());
        // Get the last (usually largest) image URL - look for highest resolution
        const lastUrl = srcsetUrls[srcsetUrls.length - 1];
        const urlMatch = lastUrl.match(/^([^\s]+)/);
        if (urlMatch) {
          src = urlMatch[1];
        }
      }
      
      // Try data-srcset
      if (!src && dataSrcset) {
        const srcsetUrls = dataSrcset.split(',').map(s => s.trim());
        const lastUrl = srcsetUrls[srcsetUrls.length - 1];
        const urlMatch = lastUrl.match(/^([^\s]+)/);
        if (urlMatch) {
          src = urlMatch[1];
        }
      }
      
      // Fallback to regular src attributes
      if (!src && regularSrc && !regularSrc.includes('data:image')) {
        src = regularSrc;
      }
      
      if (!src && dataSrc && !dataSrc.includes('data:image')) {
        src = dataSrc;
      }
      
      if (src && !src.includes('data:image')) {
        const absoluteUrl = makeAbsoluteUrl(src, baseUrl);
        if (absoluteUrl && !images.some(img => img.url === absoluteUrl)) {
          // Filter out small images, logos, and common junk
          const isJunkImage = (
            src.includes('logo') ||
            src.includes('icon') ||
            src.includes('avatar') ||
            src.includes('profile') ||
            src.includes('1x1') ||
            src.includes('pixel') ||
            src.includes('blank.gif') ||
            absoluteUrl.includes('width=1') ||
            absoluteUrl.includes('height=1')
          );
          
          if (!isJunkImage) {
            images.push({
              url: absoluteUrl,
              alt: alt.trim() || undefined,
              caption: alt.trim() || undefined
            });
          }
        }
      }
    });
  }
  
  // Limit to top 3 images to avoid too much data
  return images.slice(0, 3);
}

function makeAbsoluteUrl(url: string, baseUrl: string): string | undefined {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    // If URL construction fails, try the raw URL if it's already absolute
    if (url.startsWith('http')) {
      return url;
    }
    return undefined;
  }
}

export async function scrapeFullContent(article: Article): Promise<Article> {
  try {
    // Skip if we already have substantial content
    if (article.content && article.content.length > 500) {
      return article;
    }
    
    console.log(`Scraping full content for: ${article.title}`);
    
    let response;
    try {
      response = await axiosInstance.get(article.url);
    } catch (axiosError: any) {
      // Handle specific errors gracefully
      if (axiosError.code === 'HPE_HEADER_OVERFLOW') {
        console.log('Header overflow error - trying with curl-like headers');
        // Try with minimal headers on retry
        response = await axios.get(article.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'curl/7.68.0'
          },
          validateStatus: (status) => status < 500
        });
      } else if (axiosError.response?.status === 403 || axiosError.response?.status === 401) {
        console.log('Access denied - skipping');
        return article;
      } else {
        throw axiosError;
      }
    }
    
    // Extract images from the HTML
    article.images = extractImages(response.data, article.url);
    
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