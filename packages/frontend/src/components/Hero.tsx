import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <img 
          src="https://20627419.fs1.hubspotusercontent-na1.net/hubfs/20627419/The%20Hustle/Logos/The%20Hustle%20Logo.png" 
          alt="The Hustle Logo" 
          className="h-16 w-auto"
        />
      </div>
      <h2 className="text-4xl font-bold text-gray-900">
        Get your personalized<br />
        <span className="text-orange-600">business newsletter</span>
      </h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        We curate daily sources and create a newsletter tailored to your interests. 
        It's The Hustle, but written just for you.
      </p>
    </div>
  );
};

export default Hero;