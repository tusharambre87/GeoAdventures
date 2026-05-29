import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X, Clock } from "lucide-react";

const MAX_ATTEMPTS = 3;
const COOLDOWN_DURATION = 5 * 60 * 1000;
const COOLDOWN_STORAGE_KEY = 'parental_gate_cooldown_until';

interface ParentalGateProps {
  children: React.ReactNode;
  href: string;
  className?: string;
  openInNewTab?: boolean;
}

interface ParentalGateContextType {
  requestAccess: (onSuccess: () => void) => void;
  isGeoAdventuresUnlocked: boolean;
  requestGeoAdventuresAccess: (onSuccess: () => void) => void;
}

const ParentalGateContext = createContext<ParentalGateContextType | null>(null);

export function useParentalGate() {
  const context = useContext(ParentalGateContext);
  if (!context) {
    // Return a safe fallback instead of throwing to handle edge cases
    // during lazy loading or when component mounts before provider
    console.warn("useParentalGate called outside ParentalGateProvider, returning fallback");
    return {
      requestAccess: (onSuccess: () => void) => onSuccess(),
      isGeoAdventuresUnlocked: false,
      requestGeoAdventuresAccess: (onSuccess: () => void) => onSuccess(),
    };
  }
  return context;
}

function generateMathQuestion() {
  const questionTypes = ['multiply', 'subtract', 'add'];
  const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  
  let num1: number, num2: number, answer: number, question: string;
  
  if (type === 'multiply') {
    num1 = Math.floor(Math.random() * 6) + 7;
    num2 = Math.floor(Math.random() * 6) + 6;
    answer = num1 * num2;
    question = `What is ${num1} × ${num2}?`;
  } else if (type === 'subtract') {
    num1 = Math.floor(Math.random() * 30) + 45;
    num2 = Math.floor(Math.random() * 20) + 15;
    answer = num1 - num2;
    question = `What is ${num1} - ${num2}?`;
  } else {
    num1 = Math.floor(Math.random() * 20) + 25;
    num2 = Math.floor(Math.random() * 15) + 18;
    answer = num1 + num2;
    question = `What is ${num1} + ${num2}?`;
  }
  
  const wrongAnswers = [
    answer - 3,
    answer + 4,
    answer - 7,
    answer + 2,
  ].filter(a => a !== answer && a > 0);
  
  const shuffledOptions = [answer, wrongAnswers[0], wrongAnswers[1]]
    .sort(() => Math.random() - 0.5);
  
  return {
    question,
    answer,
    options: shuffledOptions,
  };
}

export function ParentalGate({ children, href, className, openInNewTab = true }: ParentalGateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mathProblem, setMathProblem] = useState(generateMathQuestion);
  const [showError, setShowError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (stored) {
        const until = parseInt(stored, 10);
        if (until > Date.now()) {
          setCooldownUntil(until);
        } else {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }
    
    const updateRemaining = () => {
      const remaining = Math.max(0, cooldownUntil - Date.now());
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        setCooldownUntil(null);
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
    };
    
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const formatCooldown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setIsOpen(true);
      return;
    }
    setMathProblem(generateMathQuestion());
    setShowError(false);
    setAttempts(0);
    setIsOpen(true);
  }, [cooldownUntil]);

  const handleAnswer = useCallback((selectedAnswer: number) => {
    if (selectedAnswer === mathProblem.answer) {
      setIsOpen(false);
      setShowError(false);
      if (openInNewTab) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = href;
      }
    } else {
      const newAttempts = attempts + 1;
      setShowError(true);
      setAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + COOLDOWN_DURATION;
        setCooldownUntil(until);
        try {
          localStorage.setItem(COOLDOWN_STORAGE_KEY, until.toString());
        } catch {}
      } else {
        setTimeout(() => {
          setMathProblem(generateMathQuestion());
          setShowError(false);
        }, 1500);
      }
    }
  }, [mathProblem.answer, href, openInNewTab, attempts]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowError(false);
    if (!cooldownUntil) {
      setAttempts(0);
    }
  }, [cooldownUntil]);

  const isInCooldown = cooldownUntil !== null && cooldownUntil > Date.now();
  const isLastAttempt = attempts === MAX_ATTEMPTS - 1;

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className={className}
        data-testid="parental-gate-link"
      >
        {children}
      </a>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-blue-50 to-white border-2 border-blue-200 rounded-2xl [&>button]:hidden">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              {isInCooldown ? (
                <Clock className="w-8 h-8 text-blue-600" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <DialogTitle className="text-2xl font-bold text-blue-800">
              {isInCooldown ? 'Please Wait' : 'Parents Only'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {isInCooldown 
                ? 'Too many incorrect attempts. Please try again later.'
                : 'To continue, please answer the question below. This helps us keep younger players safe.'}
            </DialogDescription>
          </DialogHeader>

          {isInCooldown ? (
            <div className="mt-6 space-y-6">
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                <p className="text-lg text-gray-600 mb-2">Try again in:</p>
                <p className="text-4xl font-bold text-blue-600">{formatCooldown(cooldownRemaining)}</p>
              </div>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-gray-500 hover:text-gray-700"
                data-testid="parental-gate-cancel"
              >
                <X className="w-4 h-4 mr-2" /> Close
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`text-sm font-medium ${isLastAttempt ? 'text-red-600' : 'text-gray-500'}`}>
                  {isLastAttempt ? '⚠️ Last attempt!' : `Attempt ${attempts + 1} of ${MAX_ATTEMPTS}`}
                </span>
              </div>
              
              <div className="bg-white rounded-xl p-6 border-2 border-blue-100 text-center">
                <p className="text-lg text-gray-600 mb-2">Solve this math problem:</p>
                <p className="text-3xl font-bold text-blue-800">{mathProblem.question}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {mathProblem.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleAnswer(option)}
                    className="h-14 text-xl font-bold border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all"
                    data-testid={`parental-gate-option-${index}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>

              {showError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-in fade-in">
                  <p className="text-amber-800 font-medium">
                    {attempts >= MAX_ATTEMPTS 
                      ? `Too many attempts. Please wait ${formatCooldown(COOLDOWN_DURATION)} before trying again.`
                      : 'Oops! Try again or ask a grown-up to help.'}
                  </p>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-gray-500 hover:text-gray-700"
                data-testid="parental-gate-cancel"
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ExternalLink({ 
  href, 
  children, 
  className,
  openInNewTab = true 
}: { 
  href: string; 
  children: React.ReactNode; 
  className?: string;
  openInNewTab?: boolean;
}) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');
  
  if (isExternal) {
    return (
      <ParentalGate href={href} className={className} openInNewTab={openInNewTab}>
        {children}
      </ParentalGate>
    );
  }
  
  return (
    <a href={href} className={className} target={openInNewTab ? "_blank" : undefined} rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function ParentalGateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mathProblem, setMathProblem] = useState(generateMathQuestion);
  const [showError, setShowError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const [isGeoAdventuresUnlocked, setIsGeoAdventuresUnlocked] = useState(false);
  const [isGeoAdventuresRequest, setIsGeoAdventuresRequest] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (stored) {
        const until = parseInt(stored, 10);
        if (until > Date.now()) {
          setCooldownUntil(until);
        } else {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }
    
    const updateRemaining = () => {
      const remaining = Math.max(0, cooldownUntil - Date.now());
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        setCooldownUntil(null);
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
    };
    
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const formatCooldown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const requestAccess = useCallback((onSuccess: () => void) => {
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setIsOpen(true);
      return;
    }
    setMathProblem(generateMathQuestion());
    setShowError(false);
    setAttempts(0);
    setIsGeoAdventuresRequest(false);
    setOnSuccessCallback(() => onSuccess);
    setIsOpen(true);
  }, [cooldownUntil]);

  const requestGeoAdventuresAccess = useCallback((onSuccess: () => void) => {
    if (isGeoAdventuresUnlocked) {
      onSuccess();
      return;
    }
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setIsGeoAdventuresRequest(true);
      setIsOpen(true);
      return;
    }
    setMathProblem(generateMathQuestion());
    setShowError(false);
    setAttempts(0);
    setIsGeoAdventuresRequest(true);
    setOnSuccessCallback(() => onSuccess);
    setIsOpen(true);
  }, [isGeoAdventuresUnlocked, cooldownUntil]);

  const handleAnswer = useCallback((selectedAnswer: number) => {
    if (selectedAnswer === mathProblem.answer) {
      setIsOpen(false);
      setShowError(false);
      if (isGeoAdventuresRequest) {
        setIsGeoAdventuresUnlocked(true);
      }
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    } else {
      const newAttempts = attempts + 1;
      setShowError(true);
      setAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + COOLDOWN_DURATION;
        setCooldownUntil(until);
        try {
          localStorage.setItem(COOLDOWN_STORAGE_KEY, until.toString());
        } catch {}
      } else {
        setTimeout(() => {
          setMathProblem(generateMathQuestion());
          setShowError(false);
        }, 1500);
      }
    }
  }, [mathProblem.answer, onSuccessCallback, isGeoAdventuresRequest, attempts]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowError(false);
    if (!cooldownUntil) {
      setAttempts(0);
    }
    setOnSuccessCallback(null);
    setIsGeoAdventuresRequest(false);
  }, [cooldownUntil]);

  const isInCooldown = cooldownUntil !== null && cooldownUntil > Date.now();
  const attemptsRemaining = MAX_ATTEMPTS - attempts;
  const isLastAttempt = attempts === MAX_ATTEMPTS - 1;

  return (
    <ParentalGateContext.Provider value={{ requestAccess, isGeoAdventuresUnlocked, requestGeoAdventuresAccess }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={`sm:max-w-md border-2 rounded-2xl [&>button]:hidden ${isGeoAdventuresRequest ? 'bg-gradient-to-b from-orange-50 to-white border-orange-200' : 'bg-gradient-to-b from-blue-50 to-white border-blue-200'}`}>
          <DialogHeader className="text-center">
            <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${isGeoAdventuresRequest ? 'bg-orange-100' : 'bg-blue-100'}`}>
              {isInCooldown ? (
                <Clock className={`w-8 h-8 ${isGeoAdventuresRequest ? 'text-orange-600' : 'text-blue-600'}`} />
              ) : (
                <ShieldCheck className={`w-8 h-8 ${isGeoAdventuresRequest ? 'text-orange-600' : 'text-blue-600'}`} />
              )}
            </div>
            <DialogTitle className={`text-2xl font-bold ${isGeoAdventuresRequest ? 'text-orange-800' : 'text-blue-800'}`}>
              {isInCooldown ? 'Please Wait' : (isGeoAdventuresRequest ? 'Parent Verification' : 'Parents Only')}
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {isInCooldown 
                ? 'Too many incorrect attempts. Please try again later.'
                : (isGeoAdventuresRequest 
                  ? 'GeoAdventures is designed for family travel journaling with parental guidance. Please verify you are a parent to continue.'
                  : 'To continue, please answer the question below. This helps us keep younger players safe.')}
            </DialogDescription>
          </DialogHeader>

          {isInCooldown ? (
            <div className="mt-6 space-y-6">
              <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                <p className="text-lg text-gray-600 mb-2">Try again in:</p>
                <p className="text-4xl font-bold text-orange-600">{formatCooldown(cooldownRemaining)}</p>
              </div>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-gray-500 hover:text-gray-700"
                data-testid="parental-gate-provider-cancel"
              >
                <X className="w-4 h-4 mr-2" /> Close
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`text-sm font-medium ${isLastAttempt ? 'text-red-600' : 'text-gray-500'}`}>
                  {isLastAttempt ? '⚠️ Last attempt!' : `Attempt ${attempts + 1} of ${MAX_ATTEMPTS}`}
                </span>
              </div>
              
              <div className={`bg-white rounded-xl p-6 border-2 text-center ${isGeoAdventuresRequest ? 'border-orange-100' : 'border-blue-100'}`}>
                <p className="text-lg text-gray-600 mb-2">Solve this math problem:</p>
                <p className={`text-3xl font-bold ${isGeoAdventuresRequest ? 'text-orange-800' : 'text-blue-800'}`}>{mathProblem.question}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {mathProblem.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleAnswer(option)}
                    className={`h-14 text-xl font-bold border-2 transition-all ${
                      isGeoAdventuresRequest 
                        ? 'border-orange-200 hover:bg-orange-50 hover:border-orange-400' 
                        : 'border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                    }`}
                    data-testid={`parental-gate-provider-option-${index}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>

              {showError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-in fade-in">
                  <p className="text-amber-800 font-medium">
                    {attempts >= MAX_ATTEMPTS 
                      ? `Too many attempts. Please wait ${formatCooldown(COOLDOWN_DURATION)} before trying again.`
                      : 'Oops! Try again or ask a grown-up to help.'}
                  </p>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-gray-500 hover:text-gray-700"
                data-testid="parental-gate-provider-cancel"
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ParentalGateContext.Provider>
  );
}
