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
          className={`${isMainTitle ? 'w-14 h-14' : 'w-10 h-10'} mr-3 inline-block`} 
        />
      )}
      <div>
        {isMainTitle ? (
          <>
            <h1 className="text-2xl font-bold text-orange-800 dark:text-orange-400">ORDINARINOS</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          </>
        ) : (
          <h2 className="text-xl font-semibold text-orange-800 dark:text-orange-400">{title}</h2>
        )}
      </div>
    </div>
  );
}