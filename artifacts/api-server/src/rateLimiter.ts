import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const stores: { [windowName: string]: RateLimitStore } = {};

function getStore(windowName: string): RateLimitStore {
  if (!stores[windowName]) {
    stores[windowName] = {};
  }
  return stores[windowName];
}

function cleanupStore(store: RateLimitStore) {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

setInterval(() => {
  for (const storeName in stores) {
    cleanupStore(stores[storeName]);
  }
}, 60000);

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later",
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
  } = options;

  const storeName = `${windowMs}_${max}`;
  const store = getStore(storeName);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[key].count++;
    }

    const remaining = Math.max(0, max - store[key].count);
    const resetTime = Math.ceil((store[key].resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (store[key].count > max) {
      console.warn(`⚠️ Rate limit exceeded for ${key} on ${req.path}`);
      return res.status(429).json({ 
        message,
        retryAfter: resetTime 
      });
    }

    next();
  };
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many signup attempts. Please try again in an hour.",
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many password reset attempts. Please try again later.",
});

export const sensitiveApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many requests. Please slow down.",
});

export const generalApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests. Please slow down.",
});
