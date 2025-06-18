import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import QueryForm from './components/QueryForm';
import NewsletterDisplay from './components/NewsletterDisplay';
import { curateArticles, generateFromCurated, checkHealth } from './api/newsletter';
import { Newsletter, CuratedArticle } from './types/newsletter';
import { AlertCircle, CheckCircle } from 'lucide-react';

type AppState = 'form' | 'curating' | 'curation-complete' | 'generating' | 'newsletter' | 'error';

function App() {
  const [state, setState] = useState<AppState>('form');
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [query, setQuery] = useState('');
  const [articleCount, setArticleCount] = useState(0);
  const [curatedArticles, setCuratedArticles] = useState<CuratedArticle[]>([]);
  const [totalArticlesConsidered, setTotalArticlesConsidered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    checkHealth().then(setIsHealthy);
  }, []);

  const handleSubmit = async (userQuery: string) => {
    setQuery(userQuery);
    setState('curating');
    setError(null);

    try {
      // Phase 1: Curate articles
      const curationResponse = await curateArticles(userQuery);
      setCuratedArticles(curationResponse.articles);
      setTotalArticlesConsidered(curationResponse.totalArticlesConsidered);
      setState('curation-complete');
      
      // Automatically proceed to Phase 2 after a brief pause
      setTimeout(async () => {
        setState('generating');
        try {
          // Phase 2: Generate newsletter
          const articleIds = curationResponse.articles.map(article => article.id);
          const generationResponse = await generateFromCurated(userQuery, articleIds);
          setNewsletter(generationResponse.newsletter);
          setArticleCount(generationResponse.articleCount);
          setState('newsletter');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to generate newsletter');
          setState('error');
        }
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setState('error');
    }
  };

  const handleNewQuery = () => {
    setState('form');
    setNewsletter(null);
    setQuery('');
    setCuratedArticles([]);
    setTotalArticlesConsidered(0);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <Header />
      
      {!isHealthy && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-center justify-center gap-2 text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">API connection issue detected. Some features may not work properly.</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {state === 'form' && (
          <div className="space-y-8">
            <Hero />
            <QueryForm onSubmit={handleSubmit} isLoading={false} />
          </div>
        )}

        {state === 'curating' && (
          <div className="space-y-8">
            <Hero />
            <QueryForm onSubmit={handleSubmit} isLoading={true} />
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Finding relevant articles...</h3>
              <p className="text-gray-600">Our AI is analyzing today's news to find the best stories for you</p>
            </div>
          </div>
        )}

        {state === 'curation-complete' && (
          <div className="space-y-8">
            <Hero />
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Articles curated successfully!</h3>
              <p className="text-gray-600 mb-4">
                Found {curatedArticles.length} relevant articles from {totalArticlesConsidered} total articles
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                {curatedArticles.map(article => (
                  <div key={article.id} className="text-left">
                    • {article.title} - {article.source}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {state === 'generating' && (
          <div className="space-y-8">
            <Hero />
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generating your newsletter...</h3>
              <p className="text-gray-600">Creating personalized content using the curated articles</p>
            </div>
          </div>
        )}

        {state === 'newsletter' && newsletter && (
          <NewsletterDisplay
            newsletter={newsletter}
            query={query}
            articleCount={articleCount}
            onNewQuery={handleNewQuery}
          />
        )}

        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Oops! Something went wrong
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleNewQuery}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;