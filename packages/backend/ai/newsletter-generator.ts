import axios from 'axios';
import { Article } from '../common/database/postgres';
import { parseJsonWithFallback } from '../utils/json-parser';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-pro';

interface NewsletterSection {
  emoji: string;
  headline: string;
  content: string;
  whyItMatters: string;
  urls: string[];
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
    URL: ${article.url}
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
5. Include source URLs for each story section
6. URLs should be listed in the "urls" array, not in callout blocks

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no extra text. Use proper JSON syntax with commas (not semicolons).

Generate a JSON response with this structure:
{
  "subject": "Newsletter subject line",
  "intro": "Brief introduction",
  "sections": [
    {
      "emoji": "Relevant emoji",
      "headline": "Story headline",
      "content": "Story analysis (2-3 paragraphs)",
      "whyItMatters": "Relevant business insight",
      "urls": ["Source article URL 1", "Source article URL 2"]
    }
  ],
  "actionableAdvice": "Your move: specific advice",
  "signoff": "Newsletter closing"
}

EXAMPLE OUTPUTS:

Example 1:
{
  "subject": "🚀 AI Chips Hit Different This Week",
  "intro": "The semiconductor game just got a lot more interesting. Here's what's moving the needle:",
  "sections": [
    {
      "emoji": "🔥",
      "headline": "NVIDIA's New Blackwell Chips Are Already Sold Out",
      "content": "NVIDIA just dropped their latest Blackwell architecture, and it's causing chaos in the best way possible. Major cloud providers are throwing elbows to get their hands on these chips, with some orders backed up until 2025. The performance gains are staggering — we're talking 4x faster training speeds compared to the previous generation.\\n\\nBut here's the kicker: the price tag matches the hype. A single Blackwell system can cost upwards of $200K, making this a rich company's game. Smaller AI startups are getting priced out, while Big Tech doubles down.",
      "whyItMatters": "This chip shortage is creating a two-tier AI economy. Companies with deep pockets will dominate, while smaller players scramble for scraps or pivot to efficiency-focused strategies.",
      "urls": ["https://techcrunch.com/nvidia-blackwell-sold-out", "https://reuters.com/nvidia-chip-shortage"]
    },
    {
      "emoji": "💰", 
      "headline": "OpenAI's Revenue Hits $3.4B Annually",
      "content": "OpenAI just leaked their latest numbers, and they're eye-watering. The company is pulling in $3.4 billion annually, up from practically zero just two years ago. ChatGPT subscriptions are driving most of the revenue, but enterprise deals are the real goldmine.\\n\\nThe plot twist? They're still burning through cash faster than a crypto whale in 2021. Training costs, talent acquisition, and compute expenses are eating into margins. Profitability is still a distant dream, but investors don't seem to care.",
      "whyItMatters": "OpenAI's revenue proves there's massive demand for AI tools, but their cash burn shows this market is still in hypergrowth mode. Expect more fundraising rounds and potential IPO discussions.",
      "urls": ["https://bloomberg.com/openai-revenue-3-4-billion"]
    }
  ],
  "actionableAdvice": "Your move: If you're in tech, start budgeting for AI infrastructure now. Chip shortages mean longer lead times, and prices aren't coming down anytime soon.",
  "signoff": "Keep innovating (and maybe start that AI chip fund),"
}

Example 2:
{
  "subject": "📊 The SaaS Shakedown Nobody Saw Coming",
  "intro": "SaaS companies are having their 'come to Jesus' moment. Growth at all costs is dead, and profitability is the new black:",
  "sections": [
    {
      "emoji": "🔥",
      "headline": "Salesforce Cuts 10% of Workforce Despite Record Revenue",
      "content": "Salesforce just pulled a classic 2024 move: record revenue, massive layoffs. The CRM giant reported $8.6B in quarterly revenue but axed 8,000+ employees anyway. CEO Marc Benioff says they're 'right-sizing for the current environment.'\\n\\nThis isn't about survival — it's about margins. Wall Street rewarded the decision with a 12% stock bump. The message is clear: growth without profitability is so 2021.",
      "whyItMatters": "When profitable companies start cutting deep, it signals a fundamental shift in SaaS economics. Expect more 'right-sizing' across the industry as companies prioritize efficiency over expansion.",
      "urls": ["https://salesforce.com/layoffs-announcement", "https://wsj.com/salesforce-workforce-reduction"]
    }
  ],
  "actionableAdvice": "Your move: Audit your SaaS stack now. Consolidate tools, renegotiate contracts, and focus on ROI metrics. The free lunch is officially over.",
  "signoff": "Stay profitable out there,"
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
            content: prompt
          },
          {
            role: 'user',
            content: userQuery
          }
        ],
        temperature: 0.3,
        max_tokens: 8192,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'newsletter_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                subject: {
                  type: 'string',
                  description: 'Newsletter subject line'
                },
                intro: {
                  type: 'string',
                  description: 'Brief introduction paragraph'
                },
                sections: {
                  type: 'array',
                  description: 'Array of newsletter sections',
                  items: {
                    type: 'object',
                    properties: {
                      emoji: {
                        type: 'string',
                        description: 'Relevant emoji for the section'
                      },
                      headline: {
                        type: 'string',
                        description: 'Story headline'
                      },
                      content: {
                        type: 'string',
                        description: 'Story analysis content (2-3 paragraphs)'
                      },
                      whyItMatters: {
                        type: 'string',
                        description: 'Business insight with bold formatting'
                      },
                      urls: {
                        type: 'array',
                        description: 'Source article URLs',
                        items: {
                          type: 'string'
                        }
                      }
                    },
                    required: ['emoji', 'headline', 'content', 'whyItMatters', 'urls'],
                    additionalProperties: false
                  }
                },
                actionableAdvice: {
                  type: 'string',
                  description: 'Your move: specific actionable advice'
                },
                signoff: {
                  type: 'string',
                  description: 'Newsletter closing/signoff'
                }
              },
              required: ['subject', 'intro', 'sections', 'actionableAdvice', 'signoff'],
              additionalProperties: false
            }
          }
        }
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
    const parseResult = parseJsonWithFallback<GeneratedNewsletter>(content);
    
    if (parseResult.success) {
      return parseResult.data!;
    } else {
      console.warn('Failed to parse AI response as JSON:', parseResult.error);
      console.warn('Original content:', parseResult.originalText);
      throw new Error(`JSON parsing failed: ${parseResult.error}`);
    }
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
        whyItMatters: 'This story is relevant to your interests in ' + userQuery,
        urls: [article.url]
      })),
      actionableAdvice: 'Stay tuned for more updates on ' + userQuery,
      signoff: 'Until next time!'
    };
  }
}