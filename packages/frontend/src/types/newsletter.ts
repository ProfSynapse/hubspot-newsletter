export interface NewsletterSection {
  emoji: string;
  headline: string;
  content: string;
  whyItMatters: string;
}

export interface Newsletter {
  subject: string;
  intro: string;
  sections: NewsletterSection[];
  actionableAdvice: string;
  signoff: string;
  markdown?: string;
}

export interface GenerateNewsletterResponse {
  success: boolean;
  query: string;
  articleCount: number;
  newsletter: Newsletter;
}

export interface ApiError {
  error: string;
  message: string;
}