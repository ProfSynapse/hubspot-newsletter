import axios from 'axios';
import { Article } from '../common/database/postgres';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CURATION_MODEL = 'google/gemini-2.5-flash';

interface CurationResult {
  hasRelevantArticles: boolean;
  reasoning: string;
  articleIds: number[];
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

  return `You are an expert content curator for business newsletters. Your job is to determine if any articles are relevant to the user's query and select the best ones if they exist.

AVAILABLE ARTICLES:
${articlesContext}

CRITICAL DECISION PROCESS:
1. First, determine if ANY articles are genuinely relevant to the user's query
2. Set hasRelevantArticles to true ONLY if you find articles directly related to the topic
3. Set hasRelevantArticles to false if articles are only tangentially related or completely off-topic

SELECTION CRITERIA (if relevant articles exist):
- Direct relevance to the user's interests
- Business impact and importance
- Timeliness and newsworthiness
- Diversity of perspectives/sources
- Actionable insights potential

REASONING FIELD:
- If hasRelevantArticles is TRUE: Explain why you selected these specific articles and how they relate to the query
- If hasRelevantArticles is FALSE: Explain why none of the articles match the user's query and what topics are available instead

EXAMPLES:

Query: "quantum computing startups"
Response: {
  "hasRelevantArticles": false,
  "reasoning": "None of the available articles discuss quantum computing, quantum technology, or related startups. The articles focus on AI, SaaS, fintech, and traditional tech sectors. Consider searching for topics like AI, machine learning, or tech funding instead.",
  "articleIds": []
}

Query: "AI funding rounds"
Response: {
  "hasRelevantArticles": true,
  "reasoning": "Found 4 highly relevant articles: Article 2 covers OpenAI's latest funding, Article 5 discusses VC trends in AI startups, Article 8 details Anthropic's valuation, and Article 12 analyzes AI investment patterns for 2024.",
  "articleIds": [2, 5, 8, 12]
}

IMPORTANT: It's better to return no articles than to force irrelevant content. Be honest about relevance.

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;
}

export async function curateArticles(userQuery: string, articles: Article[]): Promise<{ articleIds: number[], hasRelevantArticles: boolean, reasoning: string }> {
  try {
    if (articles.length === 0) {
      return {
        articleIds: [],
        hasRelevantArticles: false,
        reasoning: "No articles available in the database to analyze."
      };
    }

    // If we have 6 or fewer articles, still run through AI to check relevance
    // Removed automatic return of all articles

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
                hasRelevantArticles: {
                  type: 'boolean',
                  description: 'Whether any articles are relevant enough for the user\'s query'
                },
                reasoning: {
                  type: 'string',
                  description: 'If true: explanation of why these articles were selected. If false: explanation of why no articles matched the query'
                },
                articleIds: {
                  type: 'array',
                  items: {
                    type: 'number'
                  },
                  description: 'Array of selected article IDs (empty array if hasRelevantArticles is false)'
                }
              },
              required: ['hasRelevantArticles', 'reasoning', 'articleIds'],
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
    
    console.log(`AI Curation: hasRelevantArticles=${curationResult.hasRelevantArticles}, reasoning: ${curationResult.reasoning}`);
    
    // If AI determined no articles are relevant, return the result
    if (!curationResult.hasRelevantArticles) {
      return {
        articleIds: [],
        hasRelevantArticles: false,
        reasoning: curationResult.reasoning
      };
    }
    
    // Validate that the selected IDs exist in our article set
    const availableIds = articles.map(article => article.id!).filter(id => id !== undefined);
    const validSelectedIds = curationResult.articleIds.filter(id => availableIds.includes(id));
    
    if (validSelectedIds.length === 0) {
      console.warn('AI curation returned no valid article IDs despite hasRelevantArticles=true');
      return {
        articleIds: [],
        hasRelevantArticles: false,
        reasoning: "Selected articles were not found in the available set."
      };
    }
    
    return {
      articleIds: validSelectedIds,
      hasRelevantArticles: true,
      reasoning: curationResult.reasoning
    };
    
  } catch (error) {
    console.error('Error in AI article curation:', error);
    
    // Fallback: return empty to indicate error
    return {
      articleIds: [],
      hasRelevantArticles: false,
      reasoning: "Unable to determine article relevance due to a technical error. Please try again."
    };
  }
}