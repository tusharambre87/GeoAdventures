import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface PassportStampProps {
  city: string;
  date: string;
  color?: string;
  className?: string;
  rotation?: number;
  mastered?: boolean;
}

export function PassportStamp({ city, date, color = "#2563eb", className, rotation = -5, mastered = false }: PassportStampProps) {
  const displayColor = mastered ? "#D97706" : color;
  
  return (
    <motion.div 
      initial={{ scale: 2, opacity: 0, rotate: rotation - 10 }}
      animate={{ scale: 1, opacity: 1, rotate: rotation }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 15,
        mass: 1.5
      }}
      className={cn(
        "relative w-48 h-48 flex items-center justify-center rounded-full border-4 border-double select-none",
        mastered ? "mix-blend-normal" : "mix-blend-multiply",
        className
      )}
      style={{ 
        borderColor: displayColor,
        color: displayColor,
        backgroundColor: mastered ? "rgba(251, 191, 36, 0.1)" : "rgba(255, 255, 255, 0.95)",
        ...(mastered && {
          boxShadow: "0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)",
        })
      }}
    >
      {mastered && (
        <motion.div
          className="absolute -inset-1 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      
      <div className="absolute inset-0 rounded-full border border-current opacity-80 m-1" />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full absolute animate-spin-slow" style={{ animationDuration: "20s" }}>
          <path id="curve" d="M 10, 50 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="transparent" />
          <text width="500">
            <textPath xlinkHref="#curve" className="text-[10px] font-bold uppercase tracking-widest fill-current opacity-70">
              {mastered 
                ? "★ REMEMBERED ★ EXPERT EXPLORER ★ ★" 
                : "★ OFFICIAL ENTRY ★ IMMIGRATION ★ CUSTOMS ★"}
            </textPath>
          </text>
        </svg>
      </div>

      {mastered && (
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-0.5"
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -2, 0] }}
              transition={{ 
                delay: i * 0.1, 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-500 drop-shadow-sm" />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="flex flex-col items-center justify-center z-10 rotate-0">
        {mastered ? (
          <span className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1 text-amber-600 dark:text-amber-400">
            REMEMBERED
          </span>
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">ARRIVED</span>
        )}
        <h3 className="text-2xl font-heading font-black uppercase leading-none text-center max-w-[140px] break-words">{city}</h3>
        <div className="w-full h-0.5 bg-current opacity-50 my-1" />
        <span className="font-mono text-sm font-bold">{date}</span>
      </div>
    </motion.div>
  );
}
