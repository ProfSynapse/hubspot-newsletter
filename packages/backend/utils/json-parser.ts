export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  originalText?: string;
}

export function parseJsonWithFallback<T = any>(text: string): ParseResult<T> {
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      error: 'Invalid input: text must be a non-empty string',
      originalText: text
    };
  }

  const trimmed = text.trim();
  
  // Try extracting first JSON object FIRST to handle multiple objects
  const extracted = extractFirstJsonObject(trimmed);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      return {
        success: true,
        data: parsed
      };
    } catch (extractError) {
      // Continue to other fallback methods with the extracted object
      const cleaned = cleanJsonString(extracted);
      try {
        const parsed = JSON.parse(cleaned);
        return {
          success: true,
          data: parsed
        };
      } catch (cleanError) {
        // Continue to original methods
      }
    }
  }

  // Try direct JSON parsing 
  try {
    const parsed = JSON.parse(trimmed);
    return {
      success: true,
      data: parsed
    };
  } catch (directError) {
    // Continue to fallback methods
  }

  // Try extracting JSON from markdown code blocks
  const jsonFromMarkdown = extractJsonFromMarkdown(trimmed);
  if (jsonFromMarkdown) {
    try {
      const parsed = JSON.parse(jsonFromMarkdown);
      return {
        success: true,
        data: parsed
      };
    } catch (markdownError) {
      // Continue to next fallback
    }
  }

  // Try cleaning and parsing the full text
  const cleaned = cleanJsonString(trimmed);
  if (cleaned !== trimmed) {
    try {
      const parsed = JSON.parse(cleaned);
      return {
        success: true,
        data: parsed
      };
    } catch (cleanError) {
      // Final fallback failed
    }
  }

  return {
    success: false,
    error: 'Unable to parse JSON from text after trying all fallback methods',
    originalText: text
  };
}

function extractJsonFromMarkdown(text: string): string | null {
  // Match ```json ... ``` or ``` ... ``` blocks
  const codeBlockPatterns = [
    /```json\s*\n?([\s\S]*?)\n?\s*```/i,
    /```\s*\n?([\s\S]*?)\n?\s*```/i,
    /`([^`]+)`/g  // Single backticks for inline code
  ];

  for (const pattern of codeBlockPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Basic validation that it looks like JSON
      if ((extracted.startsWith('{') && extracted.endsWith('}')) || 
          (extracted.startsWith('[') && extracted.endsWith(']'))) {
        return extracted;
      }
    }
  }

  return null;
}

function cleanJsonString(text: string): string {
  return text
    // Remove leading/trailing whitespace
    .trim()
    // Remove potential markdown formatting
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^\*(.+)\*$/, '$1')
    // Remove potential HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Fix common quote issues
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Fix semicolons that should be commas in arrays/objects
    .replace(/;(\s*[}\]])/g, '$1')
    .replace(/;(\s*")/g, ',$1')
    // Fix semicolon followed by comma (malformed JSON)
    .replace(/;,/g, ',')
    // Remove trailing commas before closing braces/brackets
    .replace(/,(\s*[}\]])/g, '$1');
}

function extractFirstJsonObject(text: string): string | null {
  let braceCount = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  // First, try to find the start of a JSON object more reliably
  const possibleStarts = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      possibleStarts.push(i);
    }
  }

  // Try each possible start position
  for (const startPos of possibleStarts) {
    braceCount = 0;
    inString = false;
    escapeNext = false;

    for (let i = startPos; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          const candidate = text.substring(startPos, i + 1);
          // Basic validation that this looks like a valid JSON structure
          if (candidate.includes('"') && candidate.length > 10) {
            return candidate;
          }
        }
      }
    }
  }

  return null;
}

export function safeJsonParse<T = any>(text: string, fallbackValue: T): T {
  const result = parseJsonWithFallback<T>(text);
  return result.success ? result.data! : fallbackValue;
}