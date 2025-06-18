import React from 'react';
import { Newsletter } from '../types/newsletter';
import { RefreshCw, Copy, Check } from 'lucide-react';

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
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    if (newsletter.markdown) {
      navigator.clipboard.writeText(newsletter.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-hustle-dark mb-2">
              {newsletter.subject}
            </h2>
            <p className="text-sm text-gray-600">
              Generated from {articleCount} articles about "{query}"
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={onNewQuery}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-hustle-orange text-white hover:bg-orange-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              New Query
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-4xl mx-auto">
        <div className="text-lg text-gray-700 leading-relaxed">
          {newsletter.intro}
        </div>

        {newsletter.sections.map((section, index) => (
          <article key={index} className="border-l-4 border-hustle-orange pl-6">
            <h3 className="text-xl font-bold text-hustle-dark mb-3">
              {section.emoji} {section.headline}
            </h3>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
              {section.content}
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <strong className="text-hustle-orange">Why this matters:</strong>
              <p className="text-gray-700 mt-1">{section.whyItMatters}</p>
            </div>
          </article>
        ))}

        <div className="border-t border-gray-200 pt-8">
          <div className="bg-hustle-dark text-white rounded-lg p-6">
            <p className="font-semibold text-lg mb-2">{newsletter.actionableAdvice}</p>
          </div>
          <p className="text-gray-600 mt-4 text-center italic">
            {newsletter.signoff}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewsletterDisplay;