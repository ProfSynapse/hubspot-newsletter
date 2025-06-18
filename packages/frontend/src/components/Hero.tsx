import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="text-center space-y-4">
      <h2 className="text-4xl font-bold text-gray-900">
        Get your personalized<br />
        <span className="text-orange-600">business newsletter</span>
      </h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        We scrape 47+ business sources daily and create a newsletter tailored to your interests. 
        Think Morning Brew, but written just for you.
      </p>
    </div>
  );
};

export default Hero;