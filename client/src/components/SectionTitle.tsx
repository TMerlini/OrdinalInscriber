import React from 'react';

interface SectionTitleProps {
  title: string;
  className?: string;
  showLogo?: boolean;
  isMainTitle?: boolean;
}

export default function SectionTitle({ title, className = '', showLogo = true, isMainTitle = false }: SectionTitleProps) {
  return (
    <div className={`flex items-center mb-4 ${className}`}>
      {showLogo && (
        <img 
          src="/src/assets/logo.png" 
          alt="Ordinarinos Logo" 
          className={`${isMainTitle ? 'w-16 h-16' : 'w-12 h-12'} mr-3 inline-block`} 
        />
      )}
      <div>
        {isMainTitle ? (
          <>
            <h1 className="text-2xl font-bold text-orange-800 dark:text-orange-400">ORDINARINOS</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">{title}</p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-400">ORDINARINOS</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">{title}</p>
          </>
        )}
      </div>
    </div>
  );
}