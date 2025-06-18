import React from 'react';
import { Zap, Clock, TrendingUp } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <img 
            src="https://20627419.fs1.hubspotusercontent-na1.net/hubfs/20627419/The%20Hustle/Logos/The%20Hustle%20Logo.png"
            alt="The Hustle"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-hustle-dark mb-4">
            Get personalized business news in seconds
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered newsletter generation that captures The Hustle's voice and delivers 
            the business insights you need, tailored to your interests.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Zap className="w-10 h-10 text-hustle-orange mb-3" />
            <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Generate comprehensive newsletters in under 15 seconds
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <TrendingUp className="w-10 h-10 text-hustle-orange mb-3" />
            <h3 className="font-semibold text-lg mb-2">Always Current</h3>
            <p className="text-gray-600">
              Pulls from today's top business and tech news sources
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Clock className="w-10 h-10 text-hustle-orange mb-3" />
            <h3 className="font-semibold text-lg mb-2">5-Minute Reads</h3>
            <p className="text-gray-600">
              Concise, actionable insights in The Hustle's signature style
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;