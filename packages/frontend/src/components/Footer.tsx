import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Built for HubSpot Media Assessment • Powered by The Hustle's editorial framework
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Demo by [Your Name]
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;