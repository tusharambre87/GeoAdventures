import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// Pose types for the GeoBuddy character
export type GeoBuddyPose = 'walking' | 'waving' | 'pointing' | 'celebrating' | 'thinking';
export type GeoBuddyState = 'listening' | 'wondering' | 'remembering' | 'chatting' | 'idle';

// Articulated 3D-style GeoBuddy with independently animated parts
function GeoBuddyAvatar({ size, isHovered, pose = 'walking' }: { size: number; isHovered: boolean; pose?: GeoBuddyPose }) {
  const [blinkPhase, setBlinkPhase] = useState(false);
  
  // Random blinking
  useEffect(() => {
    const blink = () => {
      setBlinkPhase(true);
      setTimeout(() => setBlinkPhase(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Pose-specific animation values
  const getPoseAnimations = () => {
    switch (pose) {
      case 'waving':
        return {
          rightArm: { rotate: [0, -25, 0, -25, 0], duration: 0.5 },
          leftArm: { rotate: [-2, 2, -2], duration: 2 },
          body: { rotate: [-2, 2, -2], duration: 1.5 },
          eyebrows: 'raised',
          mouth: 'big-smile',
        };
      case 'pointing':
        return {
          rightArm: { rotate: [-30, -28, -30], duration: 2 },
          leftArm: { rotate: [-1, 1, -1], duration: 2.5 },
          body: { rotate: [3, 5, 3], duration: 2 },
          eyebrows: 'raised',
          mouth: 'big-smile',
        };
      case 'celebrating':
        return {
          rightArm: { rotate: [-20, -35, -20], duration: 0.4 },
          leftArm: { rotate: [15, 25, 15], duration: 0.4 },
          body: { rotate: [-5, 5, -5], duration: 0.3 },
          eyebrows: 'raised',
          mouth: 'excited',
        };
      case 'thinking':
        return {
          rightArm: { rotate: [-5, -3, -5], duration: 3 },
          leftArm: { rotate: [5, 8, 5], duration: 2.5 },
          body: { rotate: [3, 5, 3], duration: 2.5 },
          eyebrows: 'thinking',
          mouth: 'hmm',
        };
      default: // walking/idle
        return {
          rightArm: { rotate: [-2, 2, -2], duration: 2.5 },
          leftArm: { rotate: [-2, 2, -2], duration: 2 },
          body: { rotate: [0, 0, 0], duration: 2.5 },
          eyebrows: 'normal',
          mouth: 'smile',
        };
    }
  };
  
  const poseAnims = getPoseAnimations();

  return (
    <motion.svg
      viewBox="0 0 100 130"
      width={size}
      height={size * 1.3}
      style={{ overflow: 'visible' }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        {/* 3D-style gradients for depth */}
        <radialGradient id="bodyGrad3d" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#8DE4F0" />
          <stop offset="60%" stopColor="#5DC5D8" />
          <stop offset="100%" stopColor="#3BA8BC" />
        </radialGradient>
        <radialGradient id="faceGrad3d" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#E8F4F6" />
          <stop offset="100%" stopColor="#C8E0E4" />
        </radialGradient>
        <linearGradient id="bootGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A67C52" />
          <stop offset="100%" stopColor="#6B4E31" />
        </linearGradient>
        <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9956A" />
          <stop offset="50%" stopColor="#A67C52" />
          <stop offset="100%" stopColor="#7A5C3D" />
        </linearGradient>
        <linearGradient id="rollGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5A896" />
          <stop offset="100%" stopColor="#D88070" />
        </linearGradient>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.2" />
        </filter>
      </defs>
      
      {/* Ground shadow */}
      <motion.ellipse
        cx="50" cy="126"
        rx="22" ry="4"
        fill="rgba(0,0,0,0.15)"
        animate={{ 
          rx: [22, 20, 22],
          opacity: [0.15, 0.1, 0.15]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Left leg - connected to body bottom */}
      <motion.g
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '42px 84px' }}
      >
        {/* Hip joint connecting to body */}
        <ellipse cx="42" cy="84" rx="6" ry="4" fill="url(#bodyGrad3d)" />
        {/* Upper leg */}
        <rect x="38" y="84" width="8" height="14" rx="4" fill="url(#bodyGrad3d)" />
        {/* Boot */}
        <ellipse cx="42" cy="102" rx="6" ry="3.5" fill="#5A3E28" />
        <rect x="36" y="96" width="12" height="7" rx="3" fill="url(#bootGrad)" />
      </motion.g>
      
      {/* Right leg - connected to body bottom */}
      <motion.g
        animate={{ rotate: [2, -2, 2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '58px 84px' }}
      >
        {/* Hip joint connecting to body */}
        <ellipse cx="58" cy="84" rx="6" ry="4" fill="url(#bodyGrad3d)" />
        {/* Upper leg */}
        <rect x="54" y="84" width="8" height="14" rx="4" fill="url(#bodyGrad3d)" />
        {/* Boot */}
        <ellipse cx="58" cy="102" rx="6" ry="3.5" fill="#5A3E28" />
        <rect x="52" y="96" width="12" height="7" rx="3" fill="url(#bootGrad)" />
      </motion.g>
      
      {/* Backpack */}
      <g filter="url(#softShadow)">
        <rect x="70" y="32" width="22" height="32" rx="5" fill="url(#backpackGrad)" />
        <rect x="72" y="35" width="18" height="7" rx="3" fill="#D4A574" />
        <rect x="76" y="56" width="8" height="4" rx="2" fill="#5A3E28" />
        {/* Sleeping roll */}
        <ellipse cx="81" cy="28" rx="10" ry="6" fill="url(#rollGrad)" />
        <ellipse cx="81" cy="28" rx="6" ry="3.5" fill="#E89080" />
        {/* Straps */}
        <path d="M72 30 Q68 38 70 48" stroke="#5A3E28" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      
      {/* Left arm - attached to body side, holding rolled map */}
      <motion.g
        animate={{ rotate: poseAnims.leftArm.rotate }}
        transition={{ duration: poseAnims.leftArm.duration, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '16px 50px' }}
      >
        {/* Upper arm attached to body edge */}
        <ellipse cx="16" cy="50" rx="6" ry="5" fill="url(#bodyGrad3d)" />
        {/* Lower arm / forearm */}
        <ellipse cx="12" cy="54" rx="5" ry="4" fill="url(#bodyGrad3d)" />
        {/* Rolled parchment map - clearly visible scroll shape */}
        {/* Main scroll body - tan/beige parchment */}
        <rect x="1" y="44" width="10" height="28" rx="5" fill="#E8D4B8" stroke="#C4A882" strokeWidth="0.5" />
        {/* Scroll shading for 3D effect */}
        <rect x="4" y="44" width="4" height="28" rx="2" fill="#D4C4A8" />
        {/* Top roll end */}
        <ellipse cx="6" cy="44" rx="5" ry="2.5" fill="#D4C4A8" stroke="#B8A078" strokeWidth="0.5" />
        <ellipse cx="6" cy="44" rx="3.5" ry="1.5" fill="#C4B498" />
        {/* Bottom roll end */}
        <ellipse cx="6" cy="72" rx="5" ry="2.5" fill="#D4C4A8" stroke="#B8A078" strokeWidth="0.5" />
        <ellipse cx="6" cy="72" rx="3.5" ry="1.5" fill="#C4B498" />
        {/* Red ribbon/tie around scroll */}
        <rect x="2" y="55" width="8" height="4" rx="1" fill="#C53030" />
        <rect x="3" y="56" width="6" height="2" rx="0.5" fill="#E53E3E" />
        {/* Small decorative map lines peeking out */}
        <line x1="3" y1="48" x2="9" y2="48" stroke="#A0845C" strokeWidth="0.3" opacity="0.4" />
        <line x1="3" y1="50" x2="9" y2="50" stroke="#A0845C" strokeWidth="0.3" opacity="0.4" />
        <line x1="3" y1="66" x2="9" y2="66" stroke="#A0845C" strokeWidth="0.3" opacity="0.4" />
        <line x1="3" y1="68" x2="9" y2="68" stroke="#A0845C" strokeWidth="0.3" opacity="0.4" />
        
        {/* Hand and fingers gripping the map */}
        {/* Palm behind map */}
        <ellipse cx="10" cy="58" rx="4" ry="5" fill="url(#bodyGrad3d)" />
        {/* Thumb on front of map */}
        <ellipse cx="12" cy="53" rx="2.5" ry="3.5" fill="url(#bodyGrad3d)" transform="rotate(-20 12 53)" />
        <circle cx="12.5" cy="50.5" r="1.8" fill="url(#bodyGrad3d)" />
        {/* Fingers wrapping around the scroll from behind */}
        {/* Index finger */}
        <ellipse cx="0" cy="52" rx="1.8" ry="4" fill="url(#bodyGrad3d)" transform="rotate(15 0 52)" />
        <circle cx="-1" cy="49" r="1.3" fill="url(#bodyGrad3d)" />
        {/* Middle finger */}
        <ellipse cx="-1" cy="56" rx="1.8" ry="4.5" fill="url(#bodyGrad3d)" transform="rotate(10 -1 56)" />
        <circle cx="-1.5" cy="52" r="1.3" fill="url(#bodyGrad3d)" />
        {/* Ring finger */}
        <ellipse cx="0" cy="61" rx="1.6" ry="3.5" fill="url(#bodyGrad3d)" transform="rotate(5 0 61)" />
        <circle cx="-0.5" cy="58" r="1.2" fill="url(#bodyGrad3d)" />
        {/* Pinky finger */}
        <ellipse cx="1" cy="65" rx="1.4" ry="3" fill="url(#bodyGrad3d)" transform="rotate(0 1 65)" />
        <circle cx="0.5" cy="62.5" r="1" fill="url(#bodyGrad3d)" />
      </motion.g>
      
      {/* Small ring on top of head */}
      <g>
        <ellipse cx="50" cy="12" rx="6" ry="3" fill="none" stroke="#5DC5D8" strokeWidth="3" />
        <ellipse cx="50" cy="12" rx="6" ry="3" fill="none" stroke="#8DE4F0" strokeWidth="1.5" />
        {/* Connection piece */}
        <rect x="48" y="12" width="4" height="4" rx="1" fill="#5DC5D8" />
      </g>
      
      {/* Main compass body */}
      <g filter="url(#softShadow)">
        <circle cx="50" cy="50" r="36" fill="url(#bodyGrad3d)" />
        {/* Inner rim highlight */}
        <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      </g>
      
      {/* Compass face */}
      <circle cx="50" cy="50" r="28" fill="url(#faceGrad3d)" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#B8D4DA" strokeWidth="1" />
      
      {/* Cardinal directions */}
      <text x="50" y="30" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4AA8B8" fontFamily="Arial, sans-serif">N</text>
      <text x="50" y="76" textAnchor="middle" fontSize="6" fill="#88C0CA" fontFamily="Arial, sans-serif">S</text>
      <text x="28" y="53" textAnchor="middle" fontSize="6" fill="#88C0CA" fontFamily="Arial, sans-serif">W</text>
      <text x="72" y="53" textAnchor="middle" fontSize="6" fill="#88C0CA" fontFamily="Arial, sans-serif">E</text>
      
      {/* Animated compass needle */}
      <motion.g
        animate={{ rotate: [-10, 10, -10] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '50px 50px' }}
      >
        <polygon points="50,26 46,50 50,54 54,50" fill="#F97316" />
        <polygon points="50,74 46,50 50,46 54,50" fill="#94A3B8" />
        <circle cx="50" cy="50" r="5" fill="#F97316" stroke="#EA580C" strokeWidth="1" />
        <circle cx="50" cy="50" r="2.5" fill="#FED7AA" />
      </motion.g>
      
      {/* Eyes container - tracks hover */}
      <motion.g
        animate={{ x: isHovered ? 2 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Left eye white */}
        <ellipse cx="40" cy="46" rx="8" ry="10" fill="white" stroke="#4AA8B8" strokeWidth="1" />
        {/* Right eye white */}
        <ellipse cx="60" cy="46" rx="8" ry="10" fill="white" stroke="#4AA8B8" strokeWidth="1" />
        
        {/* Pupils - blink animation */}
        <motion.g
          animate={{ scaleY: blinkPhase ? 0.1 : 1 }}
          transition={{ duration: 0.08 }}
          style={{ transformOrigin: '50px 48px' }}
        >
          {/* Left pupil */}
          <motion.circle 
            cx="42" cy="48" r="4" fill="#2D3748"
            animate={{ cx: isHovered ? 44 : 42 }}
            transition={{ duration: 0.2 }}
          />
          <circle cx="44" cy="45" r="1.5" fill="white" />
          
          {/* Right pupil */}
          <motion.circle 
            cx="62" cy="48" r="4" fill="#2D3748"
            animate={{ cx: isHovered ? 64 : 62 }}
            transition={{ duration: 0.2 }}
          />
          <circle cx="64" cy="45" r="1.5" fill="white" />
        </motion.g>
        
        {/* Eyelids for blink */}
        {blinkPhase && (
          <>
            <ellipse cx="40" cy="46" rx="8" ry="10" fill="#5DC5D8" />
            <ellipse cx="60" cy="46" rx="8" ry="10" fill="#5DC5D8" />
          </>
        )}
      </motion.g>
      
      {/* Eyebrows - expressive based on pose */}
      <motion.path 
        d="M33 38 Q40 35 47 38" 
        stroke="#4AA8B8" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
        animate={{ 
          d: poseAnims.eyebrows === 'raised' || isHovered 
            ? "M33 34 Q40 31 47 34" 
            : poseAnims.eyebrows === 'thinking'
            ? "M35 36 Q40 38 45 36"
            : poseAnims.eyebrows === 'focused'
            ? "M34 36 Q40 34 46 36"
            : "M33 38 Q40 35 47 38"
        }}
      />
      <motion.path 
        d="M53 38 Q60 35 67 38" 
        stroke="#4AA8B8" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
        animate={{ 
          d: poseAnims.eyebrows === 'raised' || isHovered 
            ? "M53 34 Q60 31 67 34" 
            : poseAnims.eyebrows === 'thinking'
            ? "M55 38 Q60 36 65 38"
            : poseAnims.eyebrows === 'focused'
            ? "M54 36 Q60 34 66 36"
            : "M53 38 Q60 35 67 38"
        }}
      />
      
      {/* Rosy cheeks */}
      <ellipse cx="28" cy="56" rx="5" ry="3" fill="#FDA4AF" opacity="0.4" />
      <ellipse cx="72" cy="56" rx="5" ry="3" fill="#FDA4AF" opacity="0.4" />
      
      {/* Mouth - friendly open smile */}
      <motion.g
        transition={{ duration: 0.2 }}
      >
        {/* Inner mouth fill - dark interior */}
        <motion.path
          animate={{ 
            d: poseAnims.mouth === 'big-smile' || isHovered 
              ? "M42 61 Q50 72 58 61 Q50 66 42 61 Z" 
              : poseAnims.mouth === 'excited'
              ? "M40 59 Q50 74 60 59 Q50 67 40 59 Z"
              : poseAnims.mouth === 'hmm'
              ? "M45 64 Q50 63 55 64 Q50 65 45 64 Z"
              : "M44 62 Q50 69 56 62 Q50 65 44 62 Z"
          }}
          fill="#5C2D2D"
          transition={{ duration: 0.2 }}
        />
        {/* Tongue - subtle pink curve at bottom */}
        <motion.ellipse
          cx="50"
          cy={66}
          rx={4}
          ry={2}
          initial={{ opacity: 1 }}
          animate={{ 
            cy: poseAnims.mouth === 'big-smile' || isHovered 
              ? 67
              : poseAnims.mouth === 'excited'
              ? 69
              : poseAnims.mouth === 'hmm'
              ? 64
              : 66,
            rx: poseAnims.mouth === 'hmm' ? 2 : 4,
            ry: poseAnims.mouth === 'hmm' ? 1 : 2,
            opacity: poseAnims.mouth === 'hmm' ? 0 : 1
          }}
          fill="#E57373"
          transition={{ duration: 0.2 }}
        />
        {/* Outer lip curve - top of smile */}
        <motion.path
          animate={{ 
            d: poseAnims.mouth === 'big-smile' || isHovered 
              ? "M42 61 Q50 72 58 61" 
              : poseAnims.mouth === 'excited'
              ? "M40 59 Q50 74 60 59"
              : poseAnims.mouth === 'hmm'
              ? "M45 64 Q50 63 55 64"
              : "M44 62 Q50 69 56 62"
          }}
          stroke="#2D3748"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          transition={{ duration: 0.2 }}
        />
      </motion.g>
      
      {/* Right arm - connected to body, holding magnifying glass (right side up) */}
      <motion.g
        animate={{ rotate: isHovered ? [0, -15, 0, -15, 0] : poseAnims.rightArm.rotate }}
        transition={{ 
          duration: isHovered ? 0.5 : poseAnims.rightArm.duration, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        style={{ transformOrigin: '82px 52px' }}
      >
        {/* Arm connected to body */}
        <ellipse cx="82" cy="52" rx="6" ry="5" fill="url(#bodyGrad3d)" />
        {/* Forearm */}
        <ellipse cx="87" cy="55" rx="5" ry="4" fill="url(#bodyGrad3d)" />
        {/* Hand with palm */}
        <circle cx="91" cy="58" r="4" fill="url(#bodyGrad3d)" />
        {/* Magnifying glass lens frame (on top) */}
        <circle cx="96" cy="48" r="6" fill="none" stroke="#C0C0C0" strokeWidth="2" />
        <circle cx="96" cy="48" r="6" fill="none" stroke="#E8E8E8" strokeWidth="1" />
        {/* Glass lens */}
        <circle cx="96" cy="48" r="4.5" fill="rgba(200, 230, 255, 0.4)" />
        {/* Lens shine */}
        <ellipse cx="94" cy="46" rx="1.5" ry="2" fill="rgba(255,255,255,0.6)" />
        {/* Magnifying glass handle (below lens) */}
        <rect x="94.5" y="54" width="3" height="10" rx="1.5" fill="#8B6239" />
        <rect x="95.5" y="54" width="1.5" height="10" rx="0.75" fill="#A67C52" />
      </motion.g>
    </motion.svg>
  );
}

interface GeoBuddyCharacterProps {
  pose?: GeoBuddyPose;
  state?: GeoBuddyState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  showMessage?: boolean;
  onMessageDismiss?: () => void;
  className?: string;
  autoHide?: boolean;
  autoHideDelay?: number;
  showGlow?: boolean;
}

const sizeMap = {
  sm: 48,
  md: 72,
  lg: 100,
  xl: 130,
};

// Map states to default poses
const stateToPose: Record<GeoBuddyState, GeoBuddyPose> = {
  idle: 'walking',
  listening: 'walking',
  wondering: 'pointing',
  remembering: 'celebrating',
  chatting: 'waving',
};

// Smooth floating animation variants - gentle and calm
const avatarVariants = {
  idle: {
    y: [0, -6, 0],
    rotate: [0, 1, 0, -1, 0],
    transition: {
      y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
      rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
    },
  },
  greeting: {
    y: [0, -8, 0],
    rotate: [-2, 2, -2, 0],
    transition: {
      y: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
      rotate: { duration: 1.5, repeat: 2, ease: 'easeInOut' as const },
    },
  },
  celebrating: {
    y: [0, -10, 0],
    rotate: [-3, 3, -3, 3, 0],
    transition: {
      y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const },
      rotate: { duration: 0.8, repeat: 3, ease: 'easeInOut' as const },
    },
  },
  thinking: {
    y: [0, -4, 0],
    rotate: [0, 3, 3, 0],
    transition: {
      y: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
      rotate: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
    },
  },
};

// Glow color based on state - brighter for more visibility
const glowColors: Record<GeoBuddyState, string> = {
  idle: 'rgba(93, 197, 216, 0.6)',
  listening: 'rgba(255, 183, 77, 0.6)',
  wondering: 'rgba(156, 136, 255, 0.6)',
  remembering: 'rgba(255, 138, 128, 0.6)',
  chatting: 'rgba(129, 199, 132, 0.6)',
};

export function GeoBuddyCharacter({
  pose,
  state = 'idle',
  size = 'md',
  message,
  showMessage = false,
  onMessageDismiss,
  className = '',
  autoHide = true,
  autoHideDelay = 4000,
  showGlow = true,
}: GeoBuddyCharacterProps) {
  const [messageVisible, setMessageVisible] = useState(showMessage);
  const [isHovered, setIsHovered] = useState(false);
  const pixelSize = sizeMap[size];
  const glowSize = pixelSize * 1.3;

  // Get animation variant based on state
  const getVariant = () => {
    switch (state) {
      case 'chatting':
        return 'greeting';
      case 'wondering':
      case 'listening':
        return 'thinking';
      case 'remembering':
        return 'celebrating';
      default:
        return 'idle';
    }
  };

  useEffect(() => {
    setMessageVisible(showMessage);
    if (showMessage && autoHide) {
      const timer = setTimeout(() => {
        setMessageVisible(false);
        onMessageDismiss?.();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [showMessage, autoHide, autoHideDelay, onMessageDismiss]);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <AnimatePresence>
        {messageVisible && message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute bottom-full mb-2 max-w-[200px] px-3 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            style={{ zIndex: 10 }}
          >
            <p className="text-sm text-gray-700 dark:text-gray-200 text-center leading-relaxed">
              {message}
            </p>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-100 dark:border-gray-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid="geobuddy-character"
      >
        {/* Ambient glow ring */}
        {showGlow && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: glowSize,
              height: glowSize,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${glowColors[state]} 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Secondary pulse ring */}
        {showGlow && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: glowSize * 0.85,
              height: glowSize * 0.85,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              border: `2px solid ${glowColors[state]}`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}

        {/* Main avatar with smooth floating animations */}
        <motion.div
          className="relative z-10"
          variants={avatarVariants}
          animate={getVariant()}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 } 
          }}
          whileTap={{ 
            scale: 0.95,
            transition: { duration: 0.1 }
          }}
        >
          {/* Articulated GeoBuddy avatar with moving parts */}
          <GeoBuddyAvatar size={pixelSize} isHovered={isHovered} pose={pose || stateToPose[state]} />

          {/* Sparkle effects for celebration state */}
          {state === 'remembering' && (
            <>
              <motion.div
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{ top: '10%', left: '10%' }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="absolute w-1.5 h-1.5 bg-pink-400 rounded-full"
                style={{ top: '5%', right: '15%' }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
              />
              <motion.div
                className="absolute w-2 h-2 bg-teal-400 rounded-full"
                style={{ top: '15%', right: '5%' }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.6 }}
              />
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function GeoBuddyWithMessage({
  pose,
  state = 'idle',
  size = 'md',
  message,
  position = 'bottom-left',
  onComplete,
}: {
  pose?: GeoBuddyPose;
  state?: GeoBuddyState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleAnimationComplete = () => {
    if (!visible) {
      setShouldRender(false);
      onComplete?.();
    }
  };

  if (!shouldRender) return null;

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {visible && (
        <motion.div
          key="geobuddy-floating"
          className={`fixed ${positionClasses[position]} z-40`}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          transition={{ duration: 0.4, ease: 'backOut' }}
        >
          <GeoBuddyCharacter
            pose={pose}
            state={state}
            size={size}
            message={message}
            showMessage={!!message}
            onMessageDismiss={handleDismiss}
            autoHide={true}
            autoHideDelay={5000}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const GEOBUDDY_MESSAGES = {
  listening: {
    journeyPack: "I've heard this place has something special. Want to listen?",
    audioPlay: "Before we arrive, here's something to wonder about.",
  },
  wondering: {
    gameStart: "Just a guess — you'll see soon!",
    prompt: "I wonder what you'll notice.",
    curious: "That's interesting...",
  },
  remembering: {
    moment: "What stood out to you the most?",
    save: "This sounds like a moment worth saving.",
    recall: "Let's see what you remember.",
    gentle: "Even small memories count.",
    lore: "On your trip, you explored something amazing.",
  },
  chatting: {
    greeting: "Ask me anything about our world.",
    thinking: "Let me think about that...",
    ready: "I'm here when you're curious.",
  },
} as const;
