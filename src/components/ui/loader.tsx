import React from 'react';
import { Loader2 } from 'lucide-react';

const loaderCSS = `
.vc-spinner{--size:30px;--first:#005bba;--second:#fed500;width:100px;height:100px;position:relative;animation:vcSpin 2s linear infinite}
.vc-spinner::after,.vc-spinner::before{box-sizing:border-box;position:absolute;content:"";width:var(--size);height:var(--size);top:50%;left:50%;background:var(--first);border-radius:50%;transform:translate(-50%,-50%);animation:vcOrbit 2s linear infinite,vcUp 2s infinite}
.vc-spinner::after{background:var(--second);animation:vcOrbit 2s linear infinite,vcDown 2s infinite}

.vc-spinner-sm{width:60px;height:60px;--size:18px}
.vc-spinner-lg{width:120px;height:120px;--size:36px}

@keyframes vcSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes vcOrbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes vcUp{0%,100%{transform:none}25%{transform:translateX(-100%)}50%{transform:translateX(-100%) translateY(-100%);filter:blur(10px)}75%{transform:translateY(-100%)}}
@keyframes vcDown{0%,100%{transform:none}25%{transform:translateX(100%)}50%{transform:translateX(100%) translateY(100%);filter:blur(10px)}75%{transform:translateY(100%)}}
`;

let injected = false;
function injectStyles() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = loaderCSS;
  document.head.appendChild(s);
}

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', text, className = '' }) => {
  React.useEffect(() => { injectStyles(); }, []);
  const sc = size === 'sm' ? 'vc-spinner vc-spinner-sm' : size === 'lg' ? 'vc-spinner vc-spinner-lg' : 'vc-spinner';

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-6 ${className}`}>
      <div className={sc} />
      {text && <p className="text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  );
};

export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  React.useEffect(() => { injectStyles(); }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center gap-5">
        <div className="vc-spinner vc-spinner-lg" />
        <div className="text-center space-y-1">
          <h3 className="text-xl font-semibold text-gray-800">V Connect Portal</h3>
          <p className="text-gray-500 text-sm">{text}</p>
        </div>
      </div>
    </div>
  );
};

export const ButtonLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center space-x-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>{text}</span>
  </div>
);

export const TableLoader: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 animate-pulse">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const CardLoader: React.FC = () => {
  React.useEffect(() => { injectStyles(); }, []);

  return (
    <div className="flex items-center justify-center py-10">
      <div className="vc-spinner vc-spinner-sm" />
    </div>
  );
};

export default Loader;
