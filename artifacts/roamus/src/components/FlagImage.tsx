import { useState, useEffect, useCallback, useRef } from 'react';

interface FlagImageProps {
  src: string;
  alt: string;
  className?: string;
  countryCode?: string;
}

function extractCountryCodeFromUrl(url: string): string | null {
  const pngMatch = url.match(/flagcdn\.com\/\w+\/([a-z]{2})\.png/i);
  if (pngMatch) return pngMatch[1].toUpperCase();
  
  const svgMatch = url.match(/flagcdn\.com\/([a-z]{2})\.svg/i);
  if (svgMatch) return svgMatch[1].toUpperCase();
  
  return null;
}

function getAlternativeUrls(originalUrl: string): string[] {
  const alternatives: string[] = [];
  
  const pngMatch = originalUrl.match(/flagcdn\.com\/\w+\/([a-z]{2})\.png/i);
  const svgMatch = originalUrl.match(/flagcdn\.com\/([a-z]{2})\.svg/i);
  
  const code = pngMatch ? pngMatch[1].toLowerCase() : (svgMatch ? svgMatch[1].toLowerCase() : null);
  
  if (code) {
    if (originalUrl.includes('/w320/')) {
      alternatives.push(`https://flagcdn.com/w160/${code}.png`);
      alternatives.push(`https://flagcdn.com/w80/${code}.png`);
      alternatives.push(`https://flagcdn.com/h120/${code}.png`);
      alternatives.push(`https://flagcdn.com/${code}.svg`);
    } else if (originalUrl.includes('/w160/')) {
      alternatives.push(`https://flagcdn.com/w80/${code}.png`);
      alternatives.push(`https://flagcdn.com/h120/${code}.png`);
      alternatives.push(`https://flagcdn.com/${code}.svg`);
    } else if (originalUrl.includes('/w80/') || originalUrl.includes('/h120/')) {
      alternatives.push(`https://flagcdn.com/${code}.svg`);
    } else {
      alternatives.push(`https://flagcdn.com/w160/${code}.png`);
      alternatives.push(`https://flagcdn.com/${code}.svg`);
    }
  }
  
  return alternatives;
}

async function preCacheFlag(url: string): Promise<void> {
  if ('caches' in window && navigator.onLine) {
    try {
      const cache = await caches.open('geoquest-images-v6');
      const existing = await cache.match(url);
      if (!existing) {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          await cache.put(url, response);
        }
      }
    } catch (err) {
    }
  }
}

async function getFromCache(url: string): Promise<string | null> {
  if ('caches' in window) {
    try {
      const cache = await caches.open('geoquest-images-v6');
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {
    }
  }
  return null;
}

export function FlagImage({ src, alt, className = '', countryCode }: FlagImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const alternativesRef = useRef<string[]>([]);
  const blobUrlRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isLoadedRef = useRef(false);
  const hasErrorRef = useRef(false);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    hasErrorRef.current = hasError;
  }, [hasError]);

  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setHasError(false);
    setIsLoaded(false);
    isLoadedRef.current = false;
    hasErrorRef.current = false;
    setRetryCount(0);
    alternativesRef.current = getAlternativeUrls(src);
    
    // Add timeout to force fallback if image doesn't load within 5 seconds
    timeoutRef.current = window.setTimeout(() => {
      if (!isLoadedRef.current && !hasErrorRef.current) {
        setHasError(true);
        hasErrorRef.current = true;
      }
    }, 5000);
    
    if (!navigator.onLine) {
      getFromCache(src).then(cachedUrl => {
        if (cachedUrl) {
          blobUrlRef.current = cachedUrl;
          setImageSrc(cachedUrl);
        } else {
          setImageSrc(src);
        }
      });
    } else {
      setImageSrc(src);
    }
  }, [src]);

  const handleError = useCallback(async () => {
    if (!navigator.onLine && imageSrc === src) {
      const cachedUrl = await getFromCache(src);
      if (cachedUrl) {
        blobUrlRef.current = cachedUrl;
        setImageSrc(cachedUrl);
        return;
      }
    }
    
    if (retryCount < alternativesRef.current.length) {
      const nextUrl = alternativesRef.current[retryCount];
      setRetryCount(prev => prev + 1);
      setImageSrc(nextUrl);
      return;
    }
    
    setHasError(true);
    hasErrorRef.current = true;
  }, [src, imageSrc, retryCount]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    isLoadedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (navigator.onLine && src.includes('flagcdn.com')) {
      preCacheFlag(imageSrc);
    }
  }, [src, imageSrc]);

  if (hasError) {
    const extractedCode = extractCountryCodeFromUrl(src);
    // Prioritize extracted code from URL over countryCode prop (which might be full country name)
    const code = extractedCode || (countryCode && countryCode.length <= 3 ? countryCode.toUpperCase() : '') || '';
    
    return (
      <div 
        className={`${className} bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center border-2 border-blue-300 dark:border-blue-600`}
        title={alt}
        data-testid={`flag-fallback-${code.toLowerCase() || 'unknown'}`}
      >
        <div className="text-center p-2">
          {code ? (
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">{code}</span>
          ) : (
            <span className="text-3xl">🏳️</span>
          )}
          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium truncate max-w-full">
            {alt || 'Flag'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse`} />
      )}
      <img 
        src={imageSrc} 
        alt={alt} 
        className={`${className} ${isLoaded ? '' : 'hidden'}`}
        onError={handleError}
        onLoad={handleLoad}
        loading="eager"
        crossOrigin="anonymous"
        data-testid={`flag-image-${extractCountryCodeFromUrl(src)?.toLowerCase() || 'unknown'}`}
      />
    </>
  );
}
