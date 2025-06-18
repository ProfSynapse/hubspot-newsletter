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
  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-gray-900 mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-gray-900 mb-2">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={index} className="text-gray-600 text-sm italic border-l-4 border-orange-200 pl-4 my-4">{line.slice(1, -1)}</p>;
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
      content += `**Why it Matters**: ${section.whyItMatters}\n\n`;
      if (section.urls && section.urls.length > 0) {
        content += `> Sources: ${section.urls.join(', ')}\n\n`;
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
        <button
          onClick={onNewQuery}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
        >
          Generate Another
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <img 
              src="https://20627419.fs1.hubspotusercontent-na1.net/hubfs/20627419/The%20Hustle/Logos/The%20Hustle%20Logo.png" 
              alt="The Hustle Logo" 
              className="h-8 w-auto"
            />
            <div>
              <h3 className="text-white font-bold text-lg">Your Daily Business Brief</h3>
              <p className="text-orange-100 text-sm">Personalized • {new Date().toLocaleDateString()} • {articleCount} articles analyzed</p>
            </div>
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