
import React from 'react';
import { ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">
            VISAKHA INSTITUTE OF ENGINEERING & TECHNOLOGY
          </h3>
          <p className="text-gray-400 mb-4">
            NARAVA, VISAKHAPATNAM, ANDHRA PRADESH, INDIA - 530027
          </p>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-gray-400">Visit:</span>
            <a 
              href="https://www.viet.edu.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
            >
              <span>www.viet.edu.in</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              © 2024 VIET. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
