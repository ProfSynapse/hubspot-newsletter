import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img 
                src="https://20627419.fs1.hubspotusercontent-na1.net/hubfs/20627419/The%20Hustle/Logos/The%20Hustle%20Logo.png" 
                alt="The Hustle Logo" 
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;