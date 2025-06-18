import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="https://20627419.fs1.hubspotusercontent-na1.net/hubfs/20627419/The%20Hustle/Logos/The%20Hustle%20Logo.png"
              alt="The Hustle"
              className="h-8"
            />
            <div>
              <h1 className="text-2xl font-bold text-hustle-dark">Newsletter Bot</h1>
              <p className="text-sm text-gray-600">AI-powered business news, The Hustle style</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            HubSpot Assessment Demo
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;