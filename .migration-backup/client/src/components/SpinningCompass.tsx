import { motion } from "framer-motion";

interface SpinningCompassProps {
  size?: number;
  className?: string;
}

export function SpinningCompass({ size = 40, className }: SpinningCompassProps) {
  const svgSize = Math.floor(size * 0.6);
  
  return (
    <div 
      className={`rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md border border-white/30 ${className || ''}`}
      style={{ width: size, height: size }}
      data-testid="spinning-compass"
    >
      <motion.svg 
        width={svgSize} 
        height={svgSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow"
      >
        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
        <circle cx="12" cy="12" r="1" fill="white" />
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "12px 12px" }}
        >
          <path d="M12 4 L13.5 12 L12 11 L10.5 12 Z" fill="#F97316" />
          <path d="M12 20 L10.5 12 L12 13 L13.5 12 Z" fill="white" fillOpacity="0.5" />
        </motion.g>
      </motion.svg>
    </div>
  );
}
