import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";

export function VictoryCelebration() {
  const [showFireworks, setShowFireworks] = useState(true);

  useEffect(() => {
    // Initial burst
    const end = Date.now() + 10 * 1000; // 10 seconds

    const frame = () => {
      // If component unmounted or time is up
      if (Date.now() > end) {
        setShowFireworks(false);
        return;
      }

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00BFFF', '#1E90FF', '#4169E1']
      });

      requestAnimationFrame(frame);
    };

    if (showFireworks) {
      frame();
    }
    
    return () => {
      // Cleanup if needed, though confetti is fire-and-forget mostly
      // We can't easily stop the raf loop from outside without a ref, 
      // but the date check handles it.
    };
  }, []);

  return null;
}
