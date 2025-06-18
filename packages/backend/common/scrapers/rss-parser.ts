import Parser from 'rss-parser';
import { Article } from '../database/postgres';

const parser = new Parser({
  customFields: {
    item: ['description', 'author', 'category']
  },
  timeout: 10000
});

export const RSS_FEEDS = [
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://feeds.bloomberg.com/technology/news.rss', source: 'Bloomberg Tech' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News' },
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline', source: 'Yahoo Finance' },
  { url: 'https://venturebeat.com/feed/', source: 'VentureBeat' }
];

export async function parseFeed(feedConfig: typeof RSS_FEEDS[0]): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    
    return feed.items.map(item => ({
      title: item.title || '',
      excerpt: item.contentSnippet || item.description || '',
      source: feedConfig.source,
      url: item.link || '',
      author: item.author || '',
      published_at: item.pubDate || new Date().toISOString(),
      category: item.categories?.[0] || ''
    }));
  } catch (error) {
    console.error(`Error parsing feed ${feedConfig.source}:`, error);
    return [];
  }
}

export async function parseAllFeeds(): Promise<Article[]> {
  const allArticles: Article[] = [];
  
  for (const feed of RSS_FEEDS) {
    const articles = await parseFeed(feed);
    allArticles.push(...articles);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
  
  return allArticles;
}