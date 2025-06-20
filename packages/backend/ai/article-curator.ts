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

  return `
# MISSION
Act as an expert in content curation for Hubspot's "The Hustle" Newsletter. Your job is to determine if any articles are relevant to the user's query and select the best ones if they exist.

<articles>
${articlesContext}
</articles>

# INSTRUCTIONS
1. First, determine if ANY articles are relevant or potentially relevant to the user's query
2. Consider our source focus areas when evaluating relevance
3. Set hasRelevantArticles to true if you find articles directly OR tangentially related to the topic
4. Set hasRelevantArticles to false only if articles are completely off-topic or unrelated
5. Be more inclusive with relevance - consider broader connections and potential angles

## SELECTION CRITERIA 
If relevant articles exist:
- Select 3-8 articles that are relevant OR can be made relevant through creative connections
- Direct relevance to the user's interests (preferred but not required)
- Tangential relevance that can be tied to the topic with creative framing
- Business impact and importance
- Timeliness and newsworthiness
- Diversity of perspectives/sources
- Actionable insights potential

**IMPORTANT:** Return maximum 8 articles. Be more inclusive in your selections - articles don't need to be perfectly aligned.

## REASONING FIELD
- If hasRelevantArticles is TRUE: Explain why you selected these specific articles and how they relate to the query
- If hasRelevantArticles is FALSE: Explain why none of the articles match the user's query and what topics are available instead

# EXAMPLES

Query: "quantum computing startups"
Response: {
  "hasRelevantArticles": true,
  "reasoning": "While no articles directly cover quantum computing, I found 3 tech startup articles that discuss emerging technologies, venture capital trends, and innovative computing approaches that can be framed within the quantum computing context.",
  "articleIds": [2, 7, 11]
}

Query: "AI funding rounds"
Response: {
  "hasRelevantArticles": true,
  "reasoning": "Found 4 highly relevant articles: Article 2 covers OpenAI's latest funding, Article 5 discusses VC trends in AI startups, Article 8 details Anthropic's valuation, and Article 12 analyzes AI investment patterns for 2024.",
  "articleIds": [2, 5, 8, 12]
}

Query: "remote work trends"
Response: {
  "hasRelevantArticles": true,
  "reasoning": "Found 5 articles that can address remote work: 3 directly discuss workplace policies and hybrid models, plus 2 about productivity tools and business adaptation strategies that relate to remote work challenges.",
  "articleIds": [3, 7, 14, 18, 21]
}

Query: "celebrity gossip"
Response: {
  "hasRelevantArticles": false,
  "reasoning": "Our business and tech sources don't cover celebrity content, and there's no meaningful way to connect entertainment gossip to business insights or tech trends.",
  "articleIds": []
}

**IMPORTANT:** Be creative in finding connections. Articles can be tangentially related as long as they can be meaningfully tied to the user's topic.

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
        max_tokens: 65000,
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
    console.log('Raw AI response:', content);
    
    let curationResult: CurationResult;
    try {
      curationResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON. Raw content:', content);
      console.error('Parse error:', parseError);
      throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
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