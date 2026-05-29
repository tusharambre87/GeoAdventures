import { useEffect } from 'react';
import { useLocation } from 'wouter';

// Old Stripe checkout return handler — pricing is retired, redirect to home.
export default function Upgrade() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/', { replace: true });
  }, []);

  return null;
}
