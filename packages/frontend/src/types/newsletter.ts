export interface NewsletterSection {
  emoji: string;
  headline: string;
  content: string;
  whyItMatters: string;
  urls: string[];
}

export interface Newsletter {
  subject: string;
  intro: string;
  sections: NewsletterSection[];
  actionableAdvice: string;
  signoff: string;
  markdown?: string;
}

export interface CuratedArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string;
  excerpt: string;
}

export interface CurateArticlesResponse {
  success: boolean;
  query: string;
  hasRelevantArticles?: boolean;
  reasoning?: string;
  message?: string;
  articleCount: number;
  totalArticlesConsidered: number;
  articles: CuratedArticle[];
}

export interface GenerateNewsletterResponse {
  success: boolean;
  query: string;
  articleCount: number;
  newsletter: Newsletter;
  usedArticleIds?: number[];
}

export interface ApiError {
  error: string;
  message: string;
}