export interface ContentBlock {
  type: 'paragraph' | 'bulletList';
  content?: string;
  items?: string[];
}

export interface Hyperlink {
  linkText: string;
  url: string;
}

export interface NewsletterSection {
  heading: string;
  contentBlocks: ContentBlock[];
  hyperlinks: Hyperlink[];
}

export interface Theming {
  overallTheme: string;
  strategy: string;
  angle: string;
}

export interface Newsletter {
  subject: string;
  theming: Theming;
  thematicIntro: string;
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