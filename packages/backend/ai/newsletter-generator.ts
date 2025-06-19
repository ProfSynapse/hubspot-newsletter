import axios from 'axios';
import { Article } from '../common/database/postgres';
import { parseJsonWithFallback } from '../utils/json-parser';
import { retryAIGeneration } from '../utils/retry';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-pro';

interface ContentBlock {
  type: 'paragraph' | 'bulletList';
  content?: string;
  items?: string[];
}

interface Hyperlink {
  linkText: string;
  url: string;
}

interface NewsletterSection {
  heading: string;
  contentBlocks: ContentBlock[];
  hyperlinks: Hyperlink[];
}

interface Theming {
  overallTheme: string;
  strategy: string;
  angle: string;
}

interface FeaturedImage {
  url: string;
  caption: string;
  source: string;
}

interface GeneratedNewsletter {
  subject: string;
  theming: Theming;
  thematicIntro: string;
  featuredImage: FeaturedImage;
  sections: NewsletterSection[];
  actionableAdvice: string;
  signoff: string;
}

function createNewsletterPrompt(articles: Article[]): string {
  const articlesContext = articles.map((article, index) => {
    let context = `Article ${index + 1}:
    Title: ${article.title}
    Source: ${article.source}
    URL: ${article.url}
    Content: ${article.content || article.excerpt || 'Content not available'}
    Published: ${article.published_at}`;
    
    if (article.images && article.images.length > 0) {
      context += `
    Available Images:`;
      article.images.forEach((img, imgIndex) => {
        context += `
      - Image ${imgIndex + 1}: ${img.url}${img.alt ? ` (Alt: ${img.alt})` : ''}`;
      });
    }
    
    return context;
  }).join('\n\n');

  return `
  # MISSION
  Act as a professional newsletter copywriter for Hubspot's "The Hustle". Your job is to create a personalized newsletter based on the user's query/interests. The user will provide their specific topic or area of interest, and you should tailor the newsletter to focus on that topic using the provided news articles.

<News>
${articlesContext}
</News>

# THE HUSTLE'S STYLE
- Conversational but informed ("For years, smart glasses have been little more than a joke")
- Data-driven with specific numbers and examples
- Balanced perspective - show pros AND cons, not just hype
- Rhetorical questions as natural transitions ("Why now?", "Sound familiar?")
- Practical business implications
- Subtle skepticism mixed with genuine insight
- Connect stories to broader themes, not just list headlines
- Use phrases like "kinda nice", "pretty frustrating" for casual tone
- Always explain business impact - "why it matters" thinking

# STRUCTURE
1. FIRST: Analyze the articles and identify a connecting theme that relates to the user's query
2. Thematic intro (no heading) - sets up the big picture story around the user's topic of interest
3. REQUIRED: Include a featured image using ONLY one of the provided image URLs from the articles (do not create or infer URLs)
4. 3-4 themed sections with headings that explore different angles
5. Mix paragraphs and bullet points naturally - flexible ordering
6. REQUIRED: Each section MUST have at least one hyperlink to source articles
7. Actionable business advice that's specific and practical

# GUIDELINES 
- All fields will contain plain text only. Do not use markdown formatting (no asterisks, underscores, etc.) in captions or any other fields.
- Image captions must be plain text without any asterisks (*) or underscores (_) or other formatting.
- Every section MUST include at least one hyperlink - this is required for proper citation.

# JSON OUTPUT
Return ONLY valid JSON. No markdown, no code blocks, no extra text.

Generate a JSON response with this structure:
{
  "subject": "🤖 Theme-based subject line",
  "theming": {
    "overallTheme": "The big picture story connecting all articles",
    "strategy": "How you'll connect the articles thematically",
    "angle": "Your perspective (skeptical, optimistic, urgent, etc.)"
  },
  "thematicIntro": "Theme-setting introduction with no heading",
  "featuredImage": {
    "url": "https://example.com/image.jpg",
    "caption": "Descriptive caption for the image (plain text, no markdown formatting)",
    "source": "Source article title or publication"
  },
  "sections": [
    {
      "heading": "Section heading (often a question)",
      "contentBlocks": [
        {
          "type": "paragraph",
          "content": "Paragraph content here"
        },
        {
          "type": "bulletList",
          "items": ["Bullet point 1", "Bullet point 2"]
        }
      ],
      "hyperlinks": [
        {
          "linkText": "exact text to hyperlink",
          "url": "source article URL"
        }
      ]
    }
  ],
  "actionableAdvice": "specific business advice (no 'Your move:' prefix)",
  "signoff": "Newsletter closing"
}

EXAMPLE OUTPUTS:

Example 1 - Smart Glasses Theme:
{
  "subject": "🤖 The Smart Glasses Comeback Nobody Expected",
  "theming": {
    "overallTheme": "Smart glasses industry's redemption arc - from Google Glass failure to AI-powered comeback",
    "strategy": "Connect past failures with current AI advances and market timing. Show what's different this time while maintaining healthy skepticism",
    "angle": "Cautiously optimistic - acknowledge failures but highlight genuine improvements"
  },
  "thematicIntro": "For years, smart glasses have been little more than a joke, with Google Glass being the category's most infamous failure. And yet, Big Tech hasn't given up. Google, Meta, and Snap are all back at the same well, while Apple is rumored to be working on its own model for a 2026 release.",
  "featuredImage": {
    "url": "https://techcrunch.com/wp-content/uploads/2024/smart-glasses-comparison.jpg",
    "caption": "Several pairs of smart glasses on a blue and gray background showing the evolution from Google Glass to modern designs",
    "source": "TechCrunch"
  },
  "sections": [
    {
      "heading": "Why now?",
      "contentBlocks": [
        {
          "type": "paragraph",
          "content": "AI has significantly advanced since Google Glass. While we've seen AI-powered wearables like Humane's AI Pin fail, that's because, according to reviewers, they sucked. Wearables that actually provide a useful function, like fitness trackers, do well."
        },
        {
          "type": "bulletList",
          "items": [
            "Google's Android XR prototype allows wearers to see pertinent info about their environment",
            "Most importantly, they look like normal glasses (partnerships with Warby Parker and Gentle Monster)",
            "Not conspicuous gadgetry that people will assuredly mock, as with Google Glass"
          ]
        }
      ],
      "hyperlinks": [
        {
          "linkText": "AI-powered wearables",
          "url": "https://techcrunch.com/humane-ai-pin-review"
        },
        {
          "linkText": "Humane's AI Pin",
          "url": "https://humane.com/aipin"
        }
      ]
    }
  ],
  "actionableAdvice": "Your move: Overall adoption will likely come down to price, usefulness, battery life, and fashion. If you're in wearables or AR, focus on solving real problems, not just adding features.",
  "signoff": "Keep watching this space (literally),\n\nThe Hustle Team"
}`;
}

// Validation function to ensure newsletter has required hyperlinks and image
function validateNewsletter(newsletter: GeneratedNewsletter): boolean {
  // Check that every section has at least one hyperlink with both linkText and url
  const hasValidHyperlinks = newsletter.sections.every(section => 
    section.hyperlinks && 
    section.hyperlinks.length > 0 &&
    section.hyperlinks.every(link => 
      link.linkText && link.linkText.trim().length > 0 &&
      link.url && link.url.trim().length > 0
    )
  );
  
  // Check that there is a featured image with valid url
  const hasValidFeaturedImage = !!(newsletter.featuredImage && 
    newsletter.featuredImage.url && 
    newsletter.featuredImage.url.trim().length > 0);
  
  return hasValidHyperlinks && hasValidFeaturedImage;
}

export async function generateNewsletter(userQuery: string, articles: Article[]): Promise<GeneratedNewsletter> {
  try {
    const prompt = createNewsletterPrompt(articles);
    
    // Use retry logic for more reliable generation
    return await retryAIGeneration(
      async () => {
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
                    theming: {
                      type: 'object',
                      description: 'Thematic strategy for the newsletter',
                      properties: {
                        overallTheme: {
                          type: 'string',
                          description: 'The big picture story connecting all articles'
                        },
                        strategy: {
                          type: 'string',
                          description: 'How articles will be connected thematically'
                        },
                        angle: {
                          type: 'string',
                          description: 'Perspective or tone (skeptical, optimistic, etc.)'
                        }
                      },
                      required: ['overallTheme', 'strategy', 'angle'],
                      additionalProperties: false
                    },
                    thematicIntro: {
                      type: 'string',
                      description: 'Theme-setting introduction with no heading'
                    },
                    featuredImage: {
                      type: 'object',
                      description: 'Required featured image from one of the articles',
                      properties: {
                        url: {
                          type: 'string',
                          description: 'Direct URL to the image'
                        },
                        caption: {
                          type: 'string',
                          description: 'Descriptive caption for the image - plain text only, no markdown formatting like asterisks or underscores'
                        },
                        source: {
                          type: 'string',
                          description: 'Source article title or publication name'
                        }
                      },
                      required: ['url', 'caption', 'source'],
                      additionalProperties: false
                    },
                    sections: {
                      type: 'array',
                      description: 'Array of newsletter sections',
                      items: {
                        type: 'object',
                        properties: {
                          heading: {
                            type: 'string',
                            description: 'Section heading (often a question)'
                          },
                          contentBlocks: {
                            type: 'array',
                            description: 'Array of content blocks (paragraphs and bullet lists)',
                            items: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['paragraph', 'bulletList'],
                                  description: 'Type of content block'
                                },
                                content: {
                                  type: 'string',
                                  description: 'Paragraph content (for paragraph type)'
                                },
                                items: {
                                  type: 'array',
                                  description: 'Array of bullet point items (for bulletList type)',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: ['type'],
                              additionalProperties: false
                            }
                          },
                          hyperlinks: {
                            type: 'array',
                            description: 'Array of hyperlinks for this section',
                            minItems: 1,
                            items: {
                              type: 'object',
                              properties: {
                                linkText: {
                                  type: 'string',
                                  description: 'Exact text to hyperlink'
                                },
                                url: {
                                  type: 'string',
                                  description: 'Source article URL'
                                }
                              },
                              required: ['linkText', 'url'],
                              additionalProperties: false
                            }
                          }
                        },
                        required: ['heading', 'contentBlocks', 'hyperlinks'],
                        additionalProperties: false
                      }
                    },
                    actionableAdvice: {
                      type: 'string',
                      description: 'Specific actionable advice (no "Your move:" prefix needed)'
                    },
                    signoff: {
                      type: 'string',
                      description: 'Newsletter closing/signoff'
                    }
                  },
                  required: ['subject', 'theming', 'thematicIntro', 'featuredImage', 'sections', 'actionableAdvice', 'signoff'],
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
        console.log('Raw LLM Response:', content);
        
        const parseResult = parseJsonWithFallback<GeneratedNewsletter>(content);
        
        if (parseResult.success) {
          const newsletter = parseResult.data!;
          console.log('Parsed Newsletter JSON:', JSON.stringify(newsletter, null, 2));
          
          // Post-process to remove any markdown formatting that slipped through
          if (newsletter.featuredImage?.caption) {
            newsletter.featuredImage.caption = newsletter.featuredImage.caption
              .replace(/^\*+|\*+$/g, '') // Remove asterisks from start/end
              .replace(/^_+|_+$/g, '') // Remove underscores from start/end
              .trim();
          }
          
          // Log validation status
          const validationResult = validateNewsletter(newsletter);
          console.log('Validation Result:', validationResult);
          if (!validationResult) {
            console.log('Validation failed - checking details:');
            newsletter.sections.forEach((section, index) => {
              console.log(`Section ${index} (${section.heading}):`, {
                hyperlinksCount: section.hyperlinks?.length || 0,
                hyperlinks: section.hyperlinks
              });
            });
            console.log('Featured Image:', newsletter.featuredImage);
          }
          
          return newsletter;
        } else {
          console.warn('Failed to parse AI response as JSON:', parseResult.error);
          console.warn('Original content:', parseResult.originalText);
          throw new Error(`JSON parsing failed: ${parseResult.error}`);
        }
      },
      validateNewsletter,
      {
        maxAttempts: 3,
        delayMs: 2000,
        onRetry: (error, attempt) => {
          console.warn(`Newsletter generation attempt ${attempt} failed:`, error.message);
          console.log(`Retrying in a moment...`);
        }
      }
    );
  } catch (error) {
    console.error('Error generating newsletter:', error);
    
    // No fallback - throw error to ensure proper validation
    throw error;
  }
}