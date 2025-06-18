import axios from 'axios';
import { Article } from '../common/database/postgres';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CURATION_MODEL = 'openai/gpt-4.1-mini';

interface CurationResult {
  articleIds: number[];
  reasoning: string;
}

function createCurationPrompt(articles: Article[]): string {
  const articlesContext = articles.map((article, index) => 
    `Article ${index + 1} (ID: ${article.id}):
    Title: ${article.title}
    Source: ${article.source}
    URL: ${article.url}
    Summary: ${article.excerpt || article.content?.substring(0, 200)}
    Published: ${article.published_at}`
  ).join('\n\n');

  return `You are an expert content curator for business newsletters. Your job is to select the most relevant and valuable articles for a user's specific interests.

AVAILABLE ARTICLES:
${articlesContext}

TASK:
Select 3-6 articles that are most relevant to the user's query. Consider:
1. Direct relevance to the user's interests
2. Business impact and importance
3. Timeliness and newsworthiness
4. Diversity of perspectives/sources
5. Actionable insights potential

Return your selection as a JSON object with the article IDs and brief reasoning.

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no extra text.

{
  "reasoning": "Brief explanation of why these articles were selected",
  "articleIds": [1, 3, 7]
}`;
}

export async function curateArticles(userQuery: string, articles: Article[]): Promise<number[]> {
  try {
    if (articles.length === 0) {
      return [];
    }

    // If we have 6 or fewer articles, return all of them
    if (articles.length <= 6) {
      return articles.map(article => article.id!).filter(id => id !== undefined);
    }

    const prompt = createCurationPrompt(articles);
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: CURATION_MODEL,
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
        max_tokens: 1024,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'curation_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                articleIds: {
                  type: 'array',
                  items: {
                    type: 'number'
                  },
                  description: 'Array of selected article IDs'
                },
                reasoning: {
                  type: 'string',
                  description: 'Brief explanation of the selection criteria'
                }
              },
              required: ['articleIds', 'reasoning'],
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
    const curationResult: CurationResult = JSON.parse(content);
    
    console.log(`AI Curation reasoning: ${curationResult.reasoning}`);
    
    // Validate that the selected IDs exist in our article set
    const availableIds = articles.map(article => article.id!).filter(id => id !== undefined);
    const validSelectedIds = curationResult.articleIds.filter(id => availableIds.includes(id));
    
    if (validSelectedIds.length === 0) {
      console.warn('AI curation returned no valid article IDs, falling back to first 6 articles');
      return availableIds.slice(0, 6);
    }
    
    return validSelectedIds;
    
  } catch (error) {
    console.error('Error in AI article curation:', error);
    
    // Fallback: return first 6 articles
    const fallbackIds = articles.map(article => article.id!).filter(id => id !== undefined).slice(0, 6);
    console.log(`Falling back to first ${fallbackIds.length} articles`);
    return fallbackIds;
  }
}