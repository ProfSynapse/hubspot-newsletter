"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSS_FEEDS = void 0;
exports.parseFeed = parseFeed;
exports.parseAllFeeds = parseAllFeeds;
const rss_parser_1 = __importDefault(require("rss-parser"));
const parser = new rss_parser_1.default({
    customFields: {
        item: ['description', 'author', 'category']
    },
    timeout: 10000
});
exports.RSS_FEEDS = [
    { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
    { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
    { url: 'https://feeds.bloomberg.com/technology/news.rss', source: 'Bloomberg Tech' },
    { url: 'https://hnrss.org/frontpage', source: 'Hacker News' },
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline', source: 'Yahoo Finance' },
    { url: 'https://venturebeat.com/feed/', source: 'VentureBeat' }
];
async function parseFeed(feedConfig) {
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
    }
    catch (error) {
        console.error(`Error parsing feed ${feedConfig.source}:`, error);
        return [];
    }
}
async function parseAllFeeds() {
    const allArticles = [];
    for (const feed of exports.RSS_FEEDS) {
        const articles = await parseFeed(feed);
        allArticles.push(...articles);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }
    return allArticles;
}
