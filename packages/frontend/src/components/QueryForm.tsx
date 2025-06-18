import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface QueryFormProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTED_TOPICS = [
  'SaaS pricing strategies',
  'AI startup funding',
  'Content marketing tools',
  'Remote work trends',
  'B2B sales automation'
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
    if (!isLoading) {
      onSubmit(suggestion);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="query" className="block text-lg font-semibold text-hustle-dark mb-2">
            What business news interests you today?
          </label>
          <div className="relative">
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., AI startup funding, SaaS pricing strategies, marketing automation..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-hustle-orange focus:ring-2 focus:ring-hustle-orange/20 resize-none transition-colors"
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 bg-hustle-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating your newsletter...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Generate Newsletter
            </>
          )}
        </button>
      </form>

      <div className="mt-6">
        <p className="text-sm text-gray-600 mb-3">Popular topics:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => handleSuggestionClick(topic)}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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