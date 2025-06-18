import { parseJsonWithFallback, safeJsonParse } from '../utils/json-parser';

describe('JSON Parser Utility', () => {
  describe('parseJsonWithFallback', () => {
    it('should parse valid JSON directly', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = parseJsonWithFallback(validJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const markdownJson = '```json\n{"name": "test", "value": 123}\n```';
      const result = parseJsonWithFallback(markdownJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JSON wrapped in plain code blocks', () => {
      const codeBlockJson = '```\n{"name": "test", "value": 123}\n```';
      const result = parseJsonWithFallback(codeBlockJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JSON with extra whitespace', () => {
      const whitespaceJson = '  \n  {"name": "test", "value": 123}  \n  ';
      const result = parseJsonWithFallback(whitespaceJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JSON with curly quotes', () => {
      const curlyQuotesJson = '{"name": "test", "value": 123}';
      const result = parseJsonWithFallback(curlyQuotesJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JSON with trailing commas', () => {
      const trailingCommaJson = '{"name": "test", "value": 123,}';
      const result = parseJsonWithFallback(trailingCommaJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should extract JSON from text with surrounding content', () => {
      const textWithJson = 'Here is the result: {"name": "test", "value": 123} and that is it.';
      const result = parseJsonWithFallback(textWithJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should handle complex nested JSON in markdown', () => {
      const complexJson = `\`\`\`json
{
  "subject": "Test Newsletter",
  "sections": [
    {
      "emoji": "🔥",
      "headline": "Breaking News",
      "content": "This is a test",
      "whyItMatters": "It matters because...",
      "url": "https://example.com"
    }
  ],
  "actionableAdvice": "Do something"
}
\`\`\``;
      
      const result = parseJsonWithFallback(complexJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('subject', 'Test Newsletter');
      expect(result.data.sections).toHaveLength(1);
      expect(result.data.sections[0]).toHaveProperty('emoji', '🔥');
    });

    it('should handle JSON with escaped quotes', () => {
      const escapedJson = '{"message": "He said \\"Hello\\" to me"}';
      const result = parseJsonWithFallback(escapedJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'He said "Hello" to me' });
    });

    it('should return error for invalid input', () => {
      const result = parseJsonWithFallback('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    it('should return error for unparseable text', () => {
      const result = parseJsonWithFallback('This is just plain text with no JSON');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to parse JSON');
    });

    it('should handle arrays', () => {
      const arrayJson = '[{"name": "test1"}, {"name": "test2"}]';
      const result = parseJsonWithFallback(arrayJson);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('safeJsonParse', () => {
    it('should return parsed data on success', () => {
      const validJson = '{"name": "test"}';
      const result = safeJsonParse(validJson, { default: true });
      
      expect(result).toEqual({ name: 'test' });
    });

    it('should return fallback value on failure', () => {
      const invalidJson = 'not json';
      const fallback = { default: true };
      const result = safeJsonParse(invalidJson, fallback);
      
      expect(result).toBe(fallback);
    });
  });
});