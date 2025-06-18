import { extractImages, makeAbsoluteUrl } from '../common/scrapers/content-scraper';

// Mock HTML content for testing
const mockHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta property="og:image" content="https://example.com/og-image.jpg">
    <meta property="og:image:alt" content="OpenGraph image description">
    <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
    <meta name="twitter:image:alt" content="Twitter image description">
</head>
<body>
    <article>
        <h1>Test Article</h1>
        <img src="https://example.com/article-image1.jpg" alt="Main article image" />
        <img src="/relative/image.jpg" alt="Relative image" />
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Data URL image" />
    </article>
    <div class="content">
        <img src="https://example.com/content-image.jpg" alt="Content image" />
    </div>
</body>
</html>
`;

describe('Image Extraction', () => {
  test('should extract OpenGraph image from meta tags', () => {
    const images = extractImages(mockHTML, 'https://example.com');
    
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].url).toBe('https://example.com/og-image.jpg');
    expect(images[0].alt).toBe('OpenGraph image description');
  });

  test('should extract article images with alt text', () => {
    const images = extractImages(mockHTML, 'https://example.com');
    
    const articleImage = images.find(img => img.url === 'https://example.com/article-image1.jpg');
    expect(articleImage).toBeDefined();
    expect(articleImage?.alt).toBe('Main article image');
    expect(articleImage?.caption).toBe('Main article image');
  });

  test('should convert relative URLs to absolute', () => {
    const images = extractImages(mockHTML, 'https://example.com');
    
    const relativeImage = images.find(img => img.url === 'https://example.com/relative/image.jpg');
    expect(relativeImage).toBeDefined();
    expect(relativeImage?.alt).toBe('Relative image');
  });

  test('should skip data URLs', () => {
    const images = extractImages(mockHTML, 'https://example.com');
    
    const dataUrlImage = images.find(img => img.url?.startsWith('data:'));
    expect(dataUrlImage).toBeUndefined();
  });

  test('should limit to 3 images max', () => {
    const images = extractImages(mockHTML, 'https://example.com');
    
    expect(images.length).toBeLessThanOrEqual(3);
  });

  test('should handle empty HTML', () => {
    const images = extractImages('<html><body></body></html>', 'https://example.com');
    
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBe(0);
  });
});