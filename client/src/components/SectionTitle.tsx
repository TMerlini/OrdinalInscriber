import React, { useState } from 'react';
// Import the logo as a module for proper bundling
import logoImageSrc from '../assets/logo.png';

interface SectionTitleProps {
  title: string;
  className?: string;
  showLogo?: boolean;
  isMainTitle?: boolean;
}

export default function SectionTitle({ title, className = '', showLogo = true, isMainTitle = false }: SectionTitleProps) {
  const [imgSrc, setImgSrc] = useState(logoImageSrc);
  
  // Only use fallback if the image actually fails to load
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn("Failed to load logo image from", imgSrc);
    
    // Only apply fallback if we're not already using it
    if (imgSrc !== 'fallback') {
      const fallbackSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsPSJub25lIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjEwIiB5PSIyNSIgZm9udC1zaXplPSIxNiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5PPC90ZXh0Pjwvc3ZnPg==';
      setImgSrc('fallback');
      e.currentTarget.src = fallbackSvg;
    }
  };

  return (
    <div className={`flex items-center mb-4 ${className}`}>
      {showLogo && (
        <img 
          src={imgSrc === 'fallback' ? 
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsPSJub25lIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjEwIiB5PSIyNSIgZm9udC1zaXplPSIxNiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5PPC90ZXh0Pjwvc3ZnPg==' : 
            logoImageSrc}
          alt="Ordinarinos Logo" 
          className={`${isMainTitle ? 'w-14 h-14' : 'w-10 h-10'} mr-3 inline-block`} 
          onError={handleImageError}
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