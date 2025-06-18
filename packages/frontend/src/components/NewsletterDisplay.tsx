import React from 'react';
import { Newsletter } from '../types/newsletter';

interface NewsletterDisplayProps {
  newsletter: Newsletter;
  query: string;
  articleCount: number;
  onNewQuery: () => void;
}

const NewsletterDisplay: React.FC<NewsletterDisplayProps> = ({ 
  newsletter, 
  query, 
  articleCount,
  onNewQuery 
}) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatNewsletter());
      // Show a brief success message (you could add a toast notification here)
      alert('Newsletter copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    }
  };

  const exportToHTML = () => {
    const processHyperlinksToHTML = (text: string, hyperlinks: any[]) => {
      let processedText = text;
      hyperlinks.forEach(link => {
        const linkHTML = `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.linkText}</a>`;
        processedText = processedText.replace(link.linkText, linkHTML);
      });
      return processedText;
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newsletter.subject}</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #ea580c; border-bottom: 2px solid #fed7aa; padding-bottom: 10px; font-size: 2.2em; }
        h2 { color: #9a3412; margin-top: 30px; font-size: 1.5em; }
        h3 { color: #7c2d12; margin-top: 25px; font-size: 1.2em; }
        .intro { font-size: 1.1em; color: #4b5563; margin: 20px 0; }
        .section { margin: 25px 0; }
        .content-block { margin: 15px 0; }
        .bullet-list { margin: 10px 0 20px 20px; }
        .bullet-list li { margin: 8px 0; }
        .signoff { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-style: italic; }
        a { color: #2563eb; text-decoration: underline; }
        a:hover { color: #1d4ed8; }
    </style>
</head>
<body>
    <h1>${newsletter.subject}</h1>
    
    <div class="intro">${newsletter.thematicIntro}</div>
    
    ${newsletter.featuredImage ? `
    <div class="featured-image" style="margin: 20px 0; text-align: center;">
        <img src="${newsletter.featuredImage.url}" alt="${newsletter.featuredImage.caption}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 0.9em; color: #6b7280; margin-top: 8px; font-style: italic;">
            ${newsletter.featuredImage.caption} - ${newsletter.featuredImage.source}
        </p>
    </div>
    ` : ''}
    
    ${newsletter.sections.map(section => `
    <div class="section">
        <h2>${section.heading}</h2>
        
        ${section.contentBlocks.map(block => {
          if (block.type === 'paragraph' && block.content) {
            const processedContent = processHyperlinksToHTML(block.content, section.hyperlinks);
            return `<div class="content-block"><p>${processedContent}</p></div>`;
          } else if (block.type === 'bulletList' && block.items) {
            const processedItems = block.items.map(item => {
              const processedItem = processHyperlinksToHTML(item, section.hyperlinks);
              return `<li>${processedItem}</li>`;
            }).join('');
            return `<div class="content-block"><ul class="bullet-list">${processedItems}</ul></div>`;
          }
          return '';
        }).join('')}
    </div>
    `).join('')}
    
    <h2>Your Move</h2>
    <p>${newsletter.actionableAdvice}</p>
    
    <div class="signoff">
        ${newsletter.signoff.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-gray-900 mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('![') && line.includes('](')) {
        // Handle markdown images
        const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          const [, alt, src] = match;
          return (
            <div key={index} className="my-6 text-center">
              <img 
                src={src} 
                alt={alt} 
                className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                style={{ maxHeight: '400px' }}
              />
            </div>
          );
        }
      }
      if (line.startsWith('*') && line.endsWith('*') && line.includes(' - ')) {
        // Handle image captions
        const captionText = line.slice(1, -1); // Remove asterisks
        return (
          <p key={index} className="text-sm text-gray-600 italic text-center mb-4">
            {captionText}
          </p>
        );
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-gray-900 mb-2">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('• ')) {
        // Handle markdown links in bullet points
        const bulletText = line.slice(2);
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = bulletText.split(linkRegex);
        
        return (
          <li key={index} className="text-gray-700 mb-2 ml-6 list-disc">
            {parts.map((part, partIndex) => {
              if (partIndex % 3 === 1) {
                // This is link text
                return null;
              } else if (partIndex % 3 === 2) {
                // This is the URL, create link with previous part as text
                const linkText = parts[partIndex - 1];
                return (
                  <a 
                    key={partIndex}
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {linkText}
                  </a>
                );
              } else {
                // Regular text
                return <span key={partIndex}>{part}</span>;
              }
            })}
          </li>
        );
      }
      if (line.startsWith('> ')) {
        return <blockquote key={index} className="text-gray-600 text-sm border-l-4 border-gray-300 pl-4 my-4 bg-gray-50 py-2">{line.slice(2)}</blockquote>;
      }
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      if (line.startsWith('---')) {
        return <hr key={index} className="my-6 border-gray-200" />;
      }
      
      // Handle paragraphs with markdown links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts = line.split(linkRegex);
      
      if (parts.length > 1) {
        return (
          <p key={index} className="text-gray-700 mb-3 leading-relaxed">
            {parts.map((part, partIndex) => {
              if (partIndex % 3 === 1) {
                // This is link text
                return null;
              } else if (partIndex % 3 === 2) {
                // This is the URL, create link with previous part as text
                const linkText = parts[partIndex - 1];
                return (
                  <a 
                    key={partIndex}
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {linkText}
                  </a>
                );
              } else {
                // Regular text
                return <span key={partIndex}>{part}</span>;
              }
            })}
          </p>
        );
      }
      
      return <p key={index} className="text-gray-700 mb-3 leading-relaxed">{line}</p>;
    });
  };

  const processHyperlinks = (text: string, hyperlinks: any[]) => {
    let processedText = text;
    hyperlinks.forEach(link => {
      const linkMarkdown = `[${link.linkText}](${link.url})`;
      processedText = processedText.replace(link.linkText, linkMarkdown);
    });
    return processedText;
  };

  const formatNewsletter = () => {
    let content = `# 🔥 ${newsletter.subject}\n\n`;
    
    // Thematic intro
    content += `${newsletter.thematicIntro}\n\n`;
    
    // Featured image (if exists)
    if (newsletter.featuredImage) {
      content += `![${newsletter.featuredImage.caption}](${newsletter.featuredImage.url})\n`;
      content += `${newsletter.featuredImage.caption} - ${newsletter.featuredImage.source}\n\n`;
    }
    
    // Sections
    newsletter.sections.forEach((section) => {
      content += `## ${section.heading}\n\n`;
      
      section.contentBlocks.forEach(block => {
        if (block.type === 'paragraph' && block.content) {
          const processedContent = processHyperlinks(block.content, section.hyperlinks);
          content += `${processedContent}\n\n`;
        } else if (block.type === 'bulletList' && block.items) {
          block.items.forEach(item => {
            const processedItem = processHyperlinks(item, section.hyperlinks);
            content += `• ${processedItem}\n`;
          });
          content += `\n`;
        }
      });
    });
    
    content += `## Your Move\n\n`;
    content += `${newsletter.actionableAdvice}\n\n`;
    content += `---\n${newsletter.signoff}`;
    
    return content;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Newsletter is Ready</h2>
          <p className="text-gray-600">Based on: "{query}"</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            📋 Copy Text
          </button>
          <button
            onClick={exportToHTML}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            📄 Export HTML
          </button>
          <button
            onClick={onNewQuery}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            Generate Another
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
          <div>
            <h3 className="text-white font-bold text-lg">Your Daily Business Brief</h3>
            <p className="text-orange-100 text-sm">Personalized • {new Date().toLocaleDateString()} • {articleCount} articles analyzed</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="prose prose-gray max-w-none">
            {renderContent(formatNewsletter())}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterDisplay;