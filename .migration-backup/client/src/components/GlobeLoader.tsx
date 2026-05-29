import { motion } from "framer-motion";
import { useMemo } from "react";

const LOADING_MESSAGES = [
  "Loading your awesome adventure!",
  "Spinning up the globe...",
  "Discovering new places!",
  "Charting your journey...",
  "Packing your explorer bag!",
  "Getting the compass ready!",
  "Finding hidden treasures...",
  "Mapping out the fun!",
  "Adventure awaits...",
  "Exploring the world together!",
  "GeoBuddy is getting ready!",
  "Preparing your expedition!",
  "Gathering cool facts...",
  "Unlocking new discoveries!",
  "Your adventure starts soon!"
];

interface GlobeLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  showMessage?: boolean;
}

export function GlobeLoader({ message, size = "md", showMessage = true }: GlobeLoaderProps) {
  const randomMessage = useMemo(() => {
    return message || LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
  }, [message]);

  const sizeClasses = {
    sm: "text-3xl",
    md: "text-5xl",
    lg: "text-7xl"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4" data-testid="globe-loader">
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={sizeClasses[size]}
      >
        🌍
      </motion.div>
      {showMessage && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center px-4"
        >
          {randomMessage}
        </motion.p>
      )}
    </div>
  );
}

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center z-50">
      <GlobeLoader message={message} size="lg" />
    </div>
  );
}

export function InlineLoader({ message, size = "sm" }: { message?: string; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center justify-center py-8">
      <GlobeLoader message={message} size={size} />
    </div>
  );
}
