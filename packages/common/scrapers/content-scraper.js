"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeFullContent = scrapeFullContent;
exports.scrapeArticles = scrapeArticles;
const cheerio = __importStar(require("cheerio"));
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
const axios_1 = __importDefault(require("axios"));
const axiosInstance = axios_1.default.create({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});
async function scrapeFullContent(article) {
    try {
        // Skip if we already have substantial content
        if (article.content && article.content.length > 500) {
            return article;
        }
        console.log(`Scraping full content for: ${article.title}`);
        const response = await axiosInstance.get(article.url);
        // Try Readability first for clean article extraction
        try {
            const dom = new jsdom_1.JSDOM(response.data, { url: article.url });
            const reader = new readability_1.Readability(dom.window.document);
            const parsed = reader.parse();
            if (parsed && parsed.textContent) {
                article.content = parsed.textContent.substring(0, 5000); // Limit to 5000 chars
                article.excerpt = parsed.excerpt || article.excerpt;
                return article;
            }
        }
        catch (readabilityError) {
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
                if (content.length > 200)
                    break;
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
    }
    catch (error) {
        console.error(`Error scraping content for ${article.url}:`, error);
        // Return article with original excerpt as content
        article.content = article.excerpt;
        return article;
    }
}
async function scrapeArticles(articles) {
    const scrapedArticles = [];
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const batchPromises = batch.map(article => scrapeFullContent(article).catch(err => {
            console.error(`Failed to scrape ${article.url}:`, err);
            return article; // Return original on error
        }));
        const results = await Promise.all(batchPromises);
        scrapedArticles.push(...results);
        // Rate limiting between batches
        if (i + batchSize < articles.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return scrapedArticles;
}
