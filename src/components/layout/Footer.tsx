import React from 'react';
import { ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-2 mt-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-gray-400">
          <span className="font-semibold text-gray-300">VISAKHA INSTITUTE OF ENGINEERING & TECHNOLOGY</span>
          <span>NARAVA, VISAKHAPATNAM - 530027</span>
          <a
            href="https://www.viet.edu.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5 transition-colors"
          >
            viet.edu.in
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-gray-500">© 2024 VIET</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
