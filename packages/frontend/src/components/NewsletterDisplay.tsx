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
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newsletter.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #ea580c; border-bottom: 2px solid #fed7aa; padding-bottom: 10px; }
        h2 { color: #9a3412; margin-top: 30px; }
        .section { margin: 20px 0; }
        .why-matters { background: #fff7ed; padding: 15px; border-left: 4px solid #fb923c; margin: 10px 0; }
        .sources { background: #f9fafb; padding: 10px; border: 1px solid #e5e7eb; margin: 10px 0; font-size: 0.9em; }
        .sources a { color: #2563eb; text-decoration: none; }
        .sources a:hover { text-decoration: underline; }
        .intro { font-style: italic; color: #6b7280; }
        .signoff { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <h1>🔥 ${newsletter.subject}</h1>
    <p class="intro">${newsletter.intro}</p>
    
    <h2>The Big Stories (That Actually Matter)</h2>
    
    ${newsletter.sections.map((section, index) => `
    <div class="section">
        <h3>${section.emoji} Story #${index + 1}: ${section.headline}</h3>
        <p>${section.content}</p>
        <div class="why-matters">
            <strong>Why it Matters:</strong> ${section.whyItMatters}
        </div>
        ${section.urls && section.urls.length > 0 ? `
        <div class="sources">
            <strong>Sources:</strong>
            <ul>
                ${section.urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
    `).join('')}
    
    <h2>Why This Matters for Your Business</h2>
    <p>${newsletter.actionableAdvice}</p>
    
    <div class="signoff">
        ${newsletter.signoff}
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
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('WHYITMATTERS:')) {
        const text = line.slice(13); // Remove "WHYITMATTERS:"
        return (
          <p key={index} className="text-gray-700 mb-3 leading-relaxed">
            <strong className="font-semibold text-gray-900">Why it Matters</strong>: {text}
          </p>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-gray-900 mb-2">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={index} className="text-gray-600 text-sm italic border-l-4 border-orange-200 pl-4 my-4">{line.slice(1, -1)}</p>;
      }
      if (line.startsWith('SOURCES:')) {
        const sourcesText = line.slice(8); // Remove "SOURCES:"
        const urls = sourcesText.split('|');
        return (
          <blockquote key={index} className="text-gray-600 text-sm border-l-4 border-gray-300 pl-4 my-4 bg-gray-50 py-2">
            <strong>Sources:</strong>
            <ul className="list-disc list-inside mt-1">
              {urls.map((url, urlIndex) => (
                <li key={urlIndex}>
                  <a 
                    href={url.trim()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {url.trim()}
                  </a>
                </li>
              ))}
            </ul>
          </blockquote>
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
      return <p key={index} className="text-gray-700 mb-3 leading-relaxed">{line}</p>;
    });
  };

  const formatNewsletter = () => {
    let content = `# 🔥 ${newsletter.subject}\n\n`;
    content += `${newsletter.intro}\n\n`;
    content += `## The Big Stories (That Actually Matter)\n\n`;
    
    newsletter.sections.forEach((section, index) => {
      content += `**${section.emoji} Story #${index + 1}: ${section.headline}**\n`;
      content += `${section.content}\n\n`;
      content += `WHYITMATTERS:${section.whyItMatters}\n\n`;
      if (section.urls && section.urls.length > 0) {
        content += `SOURCES:${section.urls.join('|')}\n\n`;
      }
    });
    
    content += `## Why This Matters for Your Business\n\n`;
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