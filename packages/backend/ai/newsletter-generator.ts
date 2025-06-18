import axios from 'axios';
import { Article } from '../../common/database/sqlite';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-pro';

interface NewsletterSection {
  emoji: string;
  headline: string;
  content: string;
  whyItMatters: string;
}

interface GeneratedNewsletter {
  subject: string;
  intro: string;
  sections: NewsletterSection[];
  actionableAdvice: string;
  signoff: string;
}

function createNewsletterPrompt(userQuery: string, articles: Article[]): string {
  const articlesContext = articles.map((article, index) => 
    `Article ${index + 1}:
    Title: ${article.title}
    Source: ${article.source}
    Summary: ${article.excerpt || article.content?.substring(0, 200)}
    Published: ${article.published_at}`
  ).join('\n\n');

  return `You are a newsletter writer for The Hustle. Create a personalized newsletter based on the user's interests and today's news.

USER INTEREST: "${userQuery}"

TODAY'S RELEVANT NEWS:
${articlesContext}

REQUIREMENTS:
1. Write in The Hustle's signature style (conversational, witty, business-focused)
2. Structure: subject line, brief intro, 3-4 key stories with analysis, actionable takeaway
3. Use emojis for story headers (🔥, 💰, 📊, 🚀, 💡)
4. Keep total length to 5-minute read

Generate a JSON response with this structure:
{
  "subject": "Newsletter subject line",
  "intro": "Brief introduction",
  "sections": [
    {
      "emoji": "🔥",
      "headline": "Story headline",
      "content": "Story analysis (2-3 paragraphs)",
      "whyItMatters": "Business insight"
    }
  ],
  "actionableAdvice": "Your move: specific advice",
  "signoff": "Newsletter closing"
}`;
}

export async function generateNewsletter(userQuery: string, articles: Article[]): Promise<GeneratedNewsletter> {
  try {
    const prompt = createNewsletterPrompt(userQuery, articles);
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are The Hustle newsletter writer. Generate engaging business newsletters in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hubspot-newsletter.railway.app',
          'X-Title': 'HubSpot Newsletter Bot'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content) as GeneratedNewsletter;
  } catch (error) {
    console.error('Error generating newsletter:', error);
    
    // Fallback newsletter
    return {
      subject: `📰 Your ${userQuery} Newsletter`,
      intro: "Here's what we found on your topic:",
      sections: articles.slice(0, 3).map((article, index) => ({
        emoji: ['🔥', '💰', '📊'][index] || '📰',
        headline: article.title,
        content: article.excerpt || 'Full content unavailable',
        whyItMatters: 'This story is relevant to your interests in ' + userQuery
      })),
      actionableAdvice: 'Stay tuned for more updates on ' + userQuery,
      signoff: 'Until next time!'
    };
  }
}