interface AdBannerProps {
  position: 'top' | 'bottom' | 'side-left' | 'side-right';
  className?: string;
}

export function AdBanner({ position, className = '' }: AdBannerProps) {
  if (position === 'top') {
    return (
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-sky-400 text-gray-700 text-center py-2 text-sm font-medium shadow-md ${className}`}
        data-testid="ad-banner-top"
      >
        Advertising
      </div>
    );
  }

  if (position === 'bottom') {
    return (
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 bg-sky-400 text-gray-700 text-center py-2 text-sm font-medium shadow-md ${className}`}
        data-testid="ad-banner-bottom"
      >
        Advertising
      </div>
    );
  }

  if (position === 'side-left') {
    return (
      <div 
        className={`fixed left-0 top-10 bottom-10 z-40 hidden xl:flex w-32 bg-sky-400 text-gray-700 items-center justify-center text-sm font-medium shadow-md ${className}`}
        data-testid="ad-banner-side-left"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        Advertising
      </div>
    );
  }

  if (position === 'side-right') {
    return (
      <div 
        className={`fixed right-0 top-10 bottom-10 z-40 hidden xl:flex w-32 bg-sky-400 text-gray-700 items-center justify-center text-sm font-medium shadow-md ${className}`}
        data-testid="ad-banner-side-right"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        Advertising
      </div>
    );
  }

  return null;
}

export function AdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
