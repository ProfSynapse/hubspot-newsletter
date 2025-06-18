import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface QueryFormProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTED_TOPICS = [
  'AI & Machine Learning',
  'Crypto & Finance',
  'Tech Startups',
  'Market News',
  'SaaS & Software',
  'Venture Capital'
];

const QueryForm: React.FC<QueryFormProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSubmit(query.trim());
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">What current events interest you?</h3>
      <p className="text-sm text-gray-600">
        Ask about recent business, tech, or finance news from our curated sources. 
        <span className="text-orange-600 font-medium"> Focus on topics from the last few days.</span>
      </p>
      
      <div className="space-y-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., latest AI funding rounds, recent tech acquisitions, this week's market volatility, new startup launches..."
          className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
          disabled={isLoading}
        />
        
        <button
          onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          disabled={!query.trim() || isLoading}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Analyzing today's news...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Generate My Newsletter</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Popular topics:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => handleSuggestionClick(topic)}
              className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm rounded-full transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryForm;