import React from 'react';

interface SectionTitleProps {
  number: string;
  title: string;
  className?: string;
}

export default function SectionTitle({ number, title, className = '' }: SectionTitleProps) {
  return (
    <h2 className={`text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400 flex items-center ${className}`}>
      <img 
        src="/src/assets/logo.png" 
        alt="Ordinarinos Logo" 
        className="w-8 h-8 mr-2 inline-block" 
      />
      {number}. {title}
    </h2>
  );
}