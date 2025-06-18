import Parser from 'rss-parser';
import { Article } from '../database/postgres';

const parser = new Parser({
  customFields: {
    item: ['description', 'author', 'category']
  },
  timeout: 10000
});

export const RSS_FEEDS = [
  // Tier 1: Core Business Sources (The Hustle Style Content)
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://feeds.bloomberg.com/technology', source: 'Bloomberg Tech' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News' },
  { url: 'https://venturebeat.com/feed/', source: 'VentureBeat' },
  
  // Tier 2: Finance & Investment (Market Insights)
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline', source: 'Yahoo Finance' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC Business' },
  { url: 'https://seekingalpha.com/feed.xml', source: 'Seeking Alpha' },
  { url: 'https://www.investing.com/rss/news.rss', source: 'Investing.com' },
  
  // Tier 3: Startup & Industry Focus (HubSpot Relevant)
  { url: 'https://www.marketingland.com/feed', source: 'Marketing Land' },
  { url: 'https://feeds.inc.com/home/updates.rss', source: 'Inc.com' },
  { url: 'https://hbr.org/feed', source: 'Harvard Business Review' },
  { url: 'https://steveblank.com/feed', source: 'Steve Blank' },
  { url: 'https://feeds.feedburner.com/thenextweb', source: 'The Next Web' }
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