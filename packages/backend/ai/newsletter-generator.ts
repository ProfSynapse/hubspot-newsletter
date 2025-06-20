import axios from 'axios';
import { Article } from '../common/database/postgres';
import { parseJsonWithFallback } from '../utils/json-parser';
import { retryAIGeneration } from '../utils/retry';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4.1-mini';

interface Hyperlink {
  linkText: string;
  url: string;
}

interface ContentBlock {
  type: 'paragraph' | 'bulletList';
  content?: string;
  items?: string[];
  hyperlinks?: Hyperlink[];
}

interface NewsletterSection {
  heading: string;
  contentBlocks: ContentBlock[];
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

interface SourceArticle {
  title: string;
  url: string;
  source: string;
}

interface LLMNewsletterResponse {
  subject: string;
  theming: Theming;
  thematicIntro: string;
  featuredImage: FeaturedImage;
  sections: NewsletterSection[];
  actionableAdvice: string;
  signoff: string;
}

interface GeneratedNewsletter extends LLMNewsletterResponse {
  sources: SourceArticle[];
}

function createSystemPrompt(): string {
  return `
# MISSION
Act as a professional newsletter copywriter for Hubspot's "The Hustle". Your job is to create a personalized newsletter based on the provided news articles. The user will provide the articles in their message, and you should create a newsletter that connects these articles thematically.

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
- Creative connection-making: Find unexpected angles to tie diverse articles to the user's topic

# STRUCTURE
1. FIRST: Analyze the articles and identify a connecting theme - be creative in finding connections even if articles are tangentially related
2. Thematic intro (no heading) - sets up the big picture story, creatively tying together diverse articles
3. REQUIRED: Include a featured image using ONLY one of the provided image URLs from the articles (do not create or infer URLs)
4. 3-4 themed sections with headings that explore different angles - use creative framing to connect tangential content to the main topic
5. Mix paragraphs and bullet points naturally - flexible ordering
6. REQUIRED: Each section MUST have at least one hyperlink to source articles
7. Actionable business advice that's specific and practical
8. MANDATORY: Only output ONE newsletter JSON.

# GUIDELINES 
- All fields will contain plain text only. Do not use markdown formatting (no asterisks, underscores, etc.) in captions or any other fields.
- Image captions must be plain text without any asterisks (*) or underscores (_) or other formatting.
- CRITICAL: Every content block (paragraph and bulletList) MUST include at least one hyperlink in its hyperlinks array - this is mandatory for proper citation and validation.
- CRITICAL: No content block should have an empty hyperlinks array. Always include relevant source links.
- Hyperlinks should be attached to the specific content block where they are referenced.

# JSON OUTPUT
Return ONLY valid JSON. No markdown, no code blocks, no extra text.

Generate a JSON response with this structure:
{
  "subject": "[Insert Emoji] Theme-based subject line",
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
          "content": "Paragraph content here",
          "hyperlinks": [
            {
              "linkText": "exact text to hyperlink within this paragraph",
              "url": "source article URL"
            }
          ]
        },
        {
          "type": "bulletList",
          "items": ["Bullet point 1", "Bullet point 2"],
          "hyperlinks": [
            {
              "linkText": "text from one of the bullet points",
              "url": "source article URL"
            }
          ]
        }
      ]
    }
  ],
  "actionableAdvice": "specific business advice (no 'Your move:' prefix)",
  "signoff": "Newsletter closing"
}

# EXAMPLE OUTPUT
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
          "content": "AI has significantly advanced since Google Glass. While we've seen AI-powered wearables like Humane's AI Pin fail, that's because, according to reviewers, they sucked. Wearables that actually provide a useful function, like fitness trackers, do well.",
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
        },
        {
          "type": "bulletList",
          "items": [
            "Google's Android XR prototype allows wearers to see pertinent info about their environment",
            "Most importantly, they look like normal glasses (partnerships with Warby Parker and Gentle Monster)",
            "Not conspicuous gadgetry that people will assuredly mock, as with Google Glass"
          ],
          "hyperlinks": [
            {
              "linkText": "Google's Android XR prototype",
              "url": "https://techcrunch.com/google-android-xr"
            }
          ]
        }
      ]
    }
  ],
  "actionableAdvice": "Your move: Overall adoption will likely come down to price, usefulness, battery life, and fashion. If you're in wearables or AR, focus on solving real problems, not just adding features.",
  "signoff": "Keep watching this space (literally),\n\nThe Hustle Team"
}`;
}

function createUserMessage(articles: Article[]): string {
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

  return `Here are the news articles to create a newsletter from:

<News>
${articlesContext}
</News>

**MANDATORY**: Generate a newsletter following the JSON structure specified in your instructions.

**CRITICAL VALIDATION REQUIREMENTS**:
- Every single content block (paragraph or bulletList) MUST have at least one hyperlink in its hyperlinks array
- No content block should have an empty hyperlinks array - always include relevant source article links
- Use the article URLs provided above for your hyperlinks`;
}

// Validation function to ensure newsletter has required hyperlinks and image
function validateNewsletter(newsletter: GeneratedNewsletter): boolean {
  // Check that newsletter has basic structure
  if (!newsletter || !newsletter.sections || !Array.isArray(newsletter.sections)) {
    console.log('Validation failed: Missing or invalid sections array');
    return false;
  }
  
  // Check that every content block has hyperlinks (stricter validation)
  const hasValidHyperlinks = newsletter.sections.every((section, sectionIndex) => {
    if (!section || !section.contentBlocks || !Array.isArray(section.contentBlocks)) {
      console.log(`Validation failed: Section ${sectionIndex} missing content blocks`);
      return false;
    }
    // Every content block must have hyperlinks
    return section.contentBlocks.every((block, blockIndex) => {
      const hasValidLinks = block.hyperlinks && 
        Array.isArray(block.hyperlinks) &&
        block.hyperlinks.length > 0 &&
        block.hyperlinks.every(link => 
          link.linkText && link.linkText.trim().length > 0 &&
          link.url && link.url.trim().length > 0
        );
      
      if (!hasValidLinks) {
        console.log(`Validation failed: Section ${sectionIndex} (${section.heading}), Block ${blockIndex} (${block.type}) has no valid hyperlinks`);
      }
      
      return hasValidLinks;
    });
  });
  
  // Check that there is a featured image with valid url
  const hasValidFeaturedImage = !!(newsletter.featuredImage && 
    newsletter.featuredImage.url && 
    newsletter.featuredImage.url.trim().length > 0);
  
  return hasValidHyperlinks && hasValidFeaturedImage;
}

export async function generateNewsletter(articles: Article[]): Promise<GeneratedNewsletter> {
  const systemPrompt = createSystemPrompt();
  const userMessage = createUserMessage(articles);
  let lastResponse: string | undefined;
  let lastError: string | undefined;
  
  // Use retry logic for more reliable generation
  return await retryAIGeneration(
    async () => {
        // Build messages array with original prompt and error feedback if retrying
        const messages: Array<{ role: string; content: string }> = [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ];

        // If this is a retry attempt, include the previous error and response for context
        if (lastResponse && lastError) {
          messages.push({
            role: 'assistant',
            content: lastResponse
          });
          messages.push({
            role: 'user',
            content: `The previous response had an error: ${lastError}. 

CRITICAL: You must return ONLY valid JSON. Common errors to avoid:
- NO trailing semicolons in URLs (use "url": "https://example.com" NOT "url": "https://example.com";)
- NO missing commas between objects
- NO duplicate or malformed structure
- Ensure all content blocks have at least one hyperlink
- Featured image URL must be valid and from provided articles

Return ONLY the JSON object, no extra text or formatting.`
          });
        }

        const response = await axios.post(
          OPENROUTER_API_URL,
          {
            model: MODEL,
            messages,
            temperature: 0.3,
            max_tokens: 4000,
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
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    type: {
                                      type: 'string',
                                      enum: ['paragraph'],
                                      description: 'Type of content block'
                                    },
                                    content: {
                                      type: 'string',
                                      description: 'Paragraph content (for paragraph type)'
                                    },
                                    hyperlinks: {
                                      type: 'array',
                                      description: 'REQUIRED: Array of hyperlinks for this content block - must contain at least one hyperlink',
                                      minItems: 1,
                                      items: {
                                        type: 'object',
                                        properties: {
                                          linkText: {
                                            type: 'string',
                                            description: 'Exact text to hyperlink within this content block'
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
                                  required: ['type', 'content', 'hyperlinks'],
                                  additionalProperties: false
                                },
                                {
                                  type: 'object',
                                  properties: {
                                    type: {
                                      type: 'string',
                                      enum: ['bulletList'],
                                      description: 'Type of content block'
                                    },
                                    items: {
                                      type: 'array',
                                      description: 'Array of bullet point items (for bulletList type)',
                                      items: {
                                        type: 'string'
                                      }
                                    },
                                    hyperlinks: {
                                      type: 'array',
                                      description: 'REQUIRED: Array of hyperlinks for this content block - must contain at least one hyperlink',
                                      minItems: 1,
                                      items: {
                                        type: 'object',
                                        properties: {
                                          linkText: {
                                            type: 'string',
                                            description: 'Exact text to hyperlink within this content block'
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
                                  required: ['type', 'items', 'hyperlinks'],
                                  additionalProperties: false
                                }
                              ]
                            }
                          }
                        },
                        required: ['heading', 'contentBlocks'],
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
        lastResponse = content;
        
        const parseResult = parseJsonWithFallback<LLMNewsletterResponse>(content);
        console.log('Parse Result:', { success: parseResult.success, error: parseResult.error });
        
        if (parseResult.success) {
          const llmResponse = parseResult.data!;
          console.log('Parsed Newsletter JSON:', JSON.stringify(llmResponse, null, 2));
          
          // Post-process to remove any markdown formatting that slipped through
          if (llmResponse.featuredImage?.caption) {
            llmResponse.featuredImage.caption = llmResponse.featuredImage.caption
              .replace(/^\*+|\*+$/g, '') // Remove asterisks from start/end
              .replace(/^_+|_+$/g, '') // Remove underscores from start/end
              .trim();
          }
          
          // Create final newsletter with systematically added sources
          const newsletter: GeneratedNewsletter = {
            ...llmResponse,
            sources: articles.map(article => ({
              title: article.title,
              url: article.url,
              source: article.source
            }))
          };

          // Log validation status
          const validationResult = validateNewsletter(newsletter);
          console.log('Validation Result:', validationResult);
          if (!validationResult) {
            const errorDetails: string[] = [];
            
            // Check hyperlinks validation
            newsletter.sections.forEach((section, index) => {
              section.contentBlocks.forEach((block, blockIndex) => {
                if (!block.hyperlinks || block.hyperlinks.length === 0) {
                  errorDetails.push(`Section ${index} "${section.heading}" - Content Block ${blockIndex} missing hyperlinks`);
                }
              });
            });
            
            // Check featured image validation
            if (!newsletter.featuredImage?.url) {
              errorDetails.push('Missing or invalid featured image URL');
            }
            
            const errorMsg = `Newsletter validation failed: ${errorDetails.join('; ')}`;
            lastError = errorMsg;
            console.log('Validation failed - details:', errorDetails);
            throw new Error(errorMsg);
          }
          
          return newsletter;
        } else {
          // Enhanced error detection for JSON syntax issues
          let syntaxHints = [];
          if (content.includes('";')) {
            syntaxHints.push('Contains trailing semicolons in URLs');
          }
          if (content.match(/}\s*{/)) {
            syntaxHints.push('Missing commas between objects');
          }
          if (content.includes(',,')) {
            syntaxHints.push('Double commas detected');
          }
          
          const errorMsg = `JSON parsing failed: ${parseResult.error}${syntaxHints.length > 0 ? '. Syntax issues: ' + syntaxHints.join(', ') : ''}. Content preview: ${content.substring(0, 200)}`;
          lastError = errorMsg;
          console.warn('Failed to parse AI response as JSON:', parseResult.error);
          console.warn('Syntax hints:', syntaxHints);
          console.warn('Original content length:', content.length);
          console.warn('First 500 chars:', content.substring(0, 500));
          throw new Error(errorMsg);
        }
      },
      validateNewsletter,
      {
        maxAttempts: 3,
        delayMs: 2000,
        onRetry: (error, attempt) => {
          console.warn(`Newsletter generation attempt ${attempt} failed, retrying with error feedback...`, error.message);
          console.log(`Retrying in a moment...`);
        }
      }
    );
}