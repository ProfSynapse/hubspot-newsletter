import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import QueryForm from './components/QueryForm';
import NewsletterDisplay from './components/NewsletterDisplay';
import { generateNewsletter, checkHealth } from './api/newsletter';
import { Newsletter } from './types/newsletter';
import { AlertCircle } from 'lucide-react';

type AppState = 'form' | 'loading' | 'newsletter' | 'error';

function App() {
  const [state, setState] = useState<AppState>('form');
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [query, setQuery] = useState('');
  const [articleCount, setArticleCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    checkHealth().then(setIsHealthy);
  }, []);

  const handleSubmit = async (userQuery: string) => {
    setQuery(userQuery);
    setState('loading');
    setError(null);

    try {
      const response = await generateNewsletter(userQuery);
      setNewsletter(response.newsletter);
      setArticleCount(response.articleCount);
      setState('newsletter');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setState('error');
    }
  };

  const handleNewQuery = () => {
    setState('form');
    setNewsletter(null);
    setQuery('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {!isHealthy && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-center justify-center gap-2 text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">API connection issue detected. Some features may not work properly.</span>
          </div>
        </div>
      )}

      {state === 'form' && (
        <>
          <Hero />
          <div className="max-w-4xl mx-auto px-4 py-12">
            <QueryForm onSubmit={handleSubmit} isLoading={false} />
          </div>
        </>
      )}

      {state === 'loading' && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <QueryForm onSubmit={handleSubmit} isLoading={true} />
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 bg-white rounded-lg px-6 py-4 shadow-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-hustle-orange"></div>
              <span className="text-gray-700">Analyzing news and generating your newsletter...</span>
            </div>
          </div>
        </div>
      )}

      {state === 'newsletter' && newsletter && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <NewsletterDisplay
            newsletter={newsletter}
            query={query}
            articleCount={articleCount}
            onNewQuery={handleNewQuery}
          />
        </div>
      )}

      {state === 'error' && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Oops! Something went wrong
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleNewQuery}
              className="bg-hustle-orange text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <footer className="bg-hustle-dark text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-300">
            Built for HubSpot Media Assessment • Powered by Google Gemini 2.5 Pro
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;