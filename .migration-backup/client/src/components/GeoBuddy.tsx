import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExplorer } from '@/lib/explorerContext';
import { GeoBuddyCharacter, GEOBUDDY_MESSAGES } from './GeoBuddyCharacter';
import { useLocation } from 'wouter';
import { trackActivity } from '@/lib/identityTracking';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedTopic {
  emoji: string;
  text: string;
}

const GEOBUDDY_CONTEXT_PROMPTS: Record<string, SuggestedTopic[]> = {
  '/': [
    { emoji: '🎯', text: 'What is Guess & Go?' },
    { emoji: '📅', text: 'What is Daily Quest?' },
    { emoji: '🏅', text: 'How do I earn passport stamps?' },
    { emoji: '🎁', text: 'What is Treasure Vault?' },
    { emoji: '⭐', text: 'How do I earn stars?' },
    { emoji: '🎬', text: 'What are GeoShorts?' },
  ],
  '/guess-and-go': [
    { emoji: '🎮', text: 'How does Guess & Go work?' },
    { emoji: '💡', text: 'How do hints work?' },
    { emoji: '🃏', text: 'How do I collect cards?' },
    { emoji: '🏆', text: 'What is World Champion mode?' },
    { emoji: '🗺️', text: 'What is Explorer mode?' },
  ],
  '/play': [
    { emoji: '🎮', text: 'How does Guess & Go work?' },
    { emoji: '💡', text: 'How do hints work?' },
    { emoji: '🃏', text: 'How do I collect cards?' },
    { emoji: '🏆', text: 'What is World Champion mode?' },
  ],
  '/game': [
    { emoji: '🎮', text: 'How does Guess & Go work?' },
    { emoji: '💡', text: 'How do hints work?' },
    { emoji: '🃏', text: 'How do I collect cards?' },
    { emoji: '🏆', text: 'What is World Champion mode?' },
  ],
  '/treasure-vault': [
    { emoji: '🎁', text: 'What is the Treasure Vault?' },
    { emoji: '🃏', text: 'How do I collect more cards?' },
    { emoji: '🎯', text: 'What mini-games are there?' },
    { emoji: '⭐', text: 'How do I unlock new cities?' },
  ],
  '/daily-quest': [
    { emoji: '📅', text: 'What is Daily Quest?' },
    { emoji: '🔥', text: 'How do streaks work?' },
    { emoji: '🎁', text: 'What rewards can I earn?' },
    { emoji: '❄️', text: 'What are streak freezes?' },
  ],
  '/mini-games': [
    { emoji: '🎮', text: 'How do mini-games work?' },
    { emoji: '🔓', text: 'How do I unlock more games?' },
    { emoji: '🎯', text: 'What games are available?' },
  ],
  '/crossworld': [
    { emoji: '📝', text: 'How do CrossWorld puzzles work?' },
    { emoji: '💡', text: 'How do I get hints?' },
    { emoji: '🏆', text: 'How do I complete a puzzle?' },
  ],
  '/geoshorts': [
    { emoji: '🎬', text: 'What are GeoShorts?' },
    { emoji: '🌍', text: 'How do I learn from shorts?' },
    { emoji: '▶️', text: 'How do I watch more?' },
  ],
  '/passport': [
    { emoji: '🏅', text: 'What is my Passport?' },
    { emoji: '⭐', text: 'How do I earn mastery stars?' },
    { emoji: '📍', text: 'What are stamp states?' },
    { emoji: '✈️', text: 'How do I get travel stamps?' },
  ],
  '/souvenir-book': [
    { emoji: '📚', text: 'What is the Souvenir Book?' },
    { emoji: '🃏', text: 'How do I collect souvenirs?' },
    { emoji: '🎁', text: 'What games give souvenirs?' },
  ],
  '/find-my-home': [
    { emoji: '🦁', text: 'How does Find My Home work?' },
    { emoji: '🎯', text: 'How do I match animals?' },
  ],
  '/spell-geo': [
    { emoji: '📝', text: 'How does Spell Geo work?' },
    { emoji: '🗺️', text: 'How do I spell state names?' },
  ],
  '/geo-art': [
    { emoji: '🎨', text: 'How does Geo Art work?' },
    { emoji: '🖌️', text: 'How do I create art?' },
  ],
  '/spin-the-world': [
    { emoji: '🌍', text: 'How does Spin the Globe work?' },
    { emoji: '🎯', text: 'How do I discover new places?' },
  ],
  '/map-me': [
    { emoji: '🗺️', text: 'How does Map Me work?' },
    { emoji: '📍', text: 'How do I find cities on the map?' },
  ],
};

interface UsageInfo {
  questionsUsed: number;
  questionsRemaining: number;
  monthlyLimit: number;
  isPaid: boolean;
}


export interface GeoBuddyRef {
  celebrate: () => void;
  offerHint: () => void;
  showMessage: (message: string) => void;
}

interface GeoBuddyProps {
  embedded?: boolean;
}

export const GeoBuddy = forwardRef<GeoBuddyRef, GeoBuddyProps>(({ embedded = false }, ref) => {
  const { activeExplorer } = useExplorer();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<SuggestedTopic[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [usage, setUsage] = useState<UsageInfo>({ questionsUsed: 0, questionsRemaining: 5, monthlyLimit: 5, isPaid: false });
  const [isPulsing, setIsPulsing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  const isOnTravelMode = location.startsWith('/travel') || location.startsWith('/geoadventures');
  
  const GAME_ROUTES = [
    '/game',
    '/play',
    '/guess-and-go',
    '/crossworld',
    '/find-my-home',
    '/spell-geo',
    '/mini-games',
    '/sticker-book',
    '/souvenir-book',
    '/geo-art',
    '/spin-the-world',
    '/explore',
    '/knowledge-hub',
    '/map-me',
    '/daily-quest',
    '/geoshorts',
    '/treasure-vault',
    '/passport',
  ];
  
  const isOnGamePage = GAME_ROUTES.some(route => location.startsWith(route));
  const isOnHomePage = location === '/' || location === '';
  
  const shouldShowGeoBuddy = isOnHomePage;
  
  const isGeoGamesMode = !isOnTravelMode;
  
  const getContextualPrompts = (): SuggestedTopic[] => {
    for (const [route, prompts] of Object.entries(GEOBUDDY_CONTEXT_PROMPTS)) {
      if (location === route || (route !== '/' && location.startsWith(route))) {
        return prompts;
      }
    }
    return GEOBUDDY_CONTEXT_PROMPTS['/'] || [];
  };
  
  useEffect(() => {
    const savedPosition = localStorage.getItem('geobuddy_position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        // Use default position
      }
    }
  }, []);
  
  const handleDragEnd = (_: any, info: { point: { x: number; y: number } }) => {
    const buttonSize = 56;
    const padding = 16;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newX = info.point.x - buttonSize / 2;
    let newY = info.point.y - buttonSize / 2;
    
    newX = Math.max(padding, Math.min(windowWidth - buttonSize - padding, newX));
    newY = Math.max(padding, Math.min(windowHeight - buttonSize - padding, newY));
    
    const defaultX = windowWidth - buttonSize - padding;
    const defaultY = windowHeight - buttonSize - padding;
    
    const offsetX = newX - defaultX;
    const offsetY = newY - defaultY;
    
    setPosition({ x: offsetX, y: offsetY });
    localStorage.setItem('geobuddy_position', JSON.stringify({ x: offsetX, y: offsetY }));
    setIsDragging(false);
  };

  const explorerName = activeExplorer?.name || 'Explorer';
  const ageRange = activeExplorer?.ageRange || '6-9';
  const explorerId = activeExplorer?.id;

  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        if (isGeoGamesMode) {
          setMessages([{ 
            role: 'assistant', 
            content: `Hi ${explorerName}! 👋 I'm here to help you learn about GeoQuest! Tap any question below to get started.`
          }]);
          setSuggestedTopics(getContextualPrompts());
        } else {
          fetchWelcomeMessage();
          fetchSuggestedTopics();
        }
      }
      if (explorerId && !isGeoGamesMode) {
        fetchUsage();
      }
    }
  }, [isOpen, explorerId, isGeoGamesMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const celebrate = useCallback(async () => {
    try {
      const response = await fetch(`/api/geo-buddy/celebration?name=${encodeURIComponent(explorerName)}`);
      const data = await response.json();
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        setIsOpen(true);
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 3000);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Amazing job, ${explorerName}! 🌟` }]);
      setIsOpen(true);
    }
  }, [explorerName]);

  const offerHint = useCallback(async () => {
    try {
      const response = await fetch('/api/geo-buddy/hint');
      const data = await response.json();
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        setIsOpen(true);
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 2000);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Need help? Think about what continent this might be in! 🗺️" }]);
      setIsOpen(true);
    }
  }, []);

  const showMessage = useCallback((message: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    setIsOpen(true);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 2000);
  }, []);

  useImperativeHandle(ref, () => ({
    celebrate,
    offerHint,
    showMessage,
  }));

  const fetchUsage = async () => {
    if (!explorerId) return;
    try {
      const response = await fetch(`/api/geo-buddy/usage/${explorerId}`);
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  const fetchWelcomeMessage = async () => {
    try {
      const response = await fetch(`/api/geo-buddy/welcome?name=${encodeURIComponent(explorerName)}&ageRange=${ageRange}`);
      const data = await response.json();
      if (data.message) {
        setMessages([{ role: 'assistant', content: data.message }]);
      }
    } catch (error) {
      setMessages([{ role: 'assistant', content: `Hi ${explorerName}! 👋 I'm Geo-Buddy! Ask me about any country, city, or how to play the games! 🌍` }]);
    }
  };

  const fetchSuggestedTopics = async () => {
    try {
      const response = await fetch('/api/geo-buddy/topics');
      const data = await response.json();
      if (data.topics) {
        setSuggestedTopics(data.topics.slice(0, 6));
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    
    if (!isGeoGamesMode && usage.questionsRemaining <= 0 && !usage.isPaid) {
      setMessages(prev => [...prev, 
        { role: 'user', content: messageText.trim() },
        { role: 'assistant', content: "You've used all 5 questions this month! Come back next month for more geography fun! 🌍" }
      ]);
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: messageText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowWelcome(false);

    try {
      const response = await fetch('/api/geo-buddy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationHistory: messages,
          ageRange,
          explorerName,
          explorerId,
          context: isGeoGamesMode ? 'app-help' : 'geography',
        }),
      });

      const data = await response.json();
      
      if (!isGeoGamesMode) {
        if (response.status === 429 || data.limitReached) {
          setUsage(prev => ({ ...prev, questionsRemaining: 0 }));
        } else {
          setUsage(prev => ({
            ...prev,
            questionsUsed: prev.questionsUsed + 1,
            questionsRemaining: Math.max(0, prev.questionsRemaining - 1)
          }));
          
          if (explorerId) {
            trackActivity(explorerId, 'geobuddy_question');
          }
        }
      }
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: data.message || (isGeoGamesMode 
          ? "I'm here to help you with GeoQuest! Tap another question to learn more." 
          : "Hmm, I'm not sure! Try asking about a country or city! 🌍")
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oops! I had a little trouble there. Try again! 🌏" 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, ageRange, explorerName, explorerId, usage, isGeoGamesMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleTopicClick = (topic: SuggestedTopic) => {
    sendMessage(topic.text);
  };

  const clearChat = () => {
    setMessages([]);
    setShowWelcome(true);
    if (isGeoGamesMode) {
      setMessages([{ 
        role: 'assistant', 
        content: `Hi ${explorerName}! 👋 I'm here to help you learn about GeoQuest! Tap any question below to get started.`
      }]);
      setSuggestedTopics(getContextualPrompts());
    } else {
      fetchWelcomeMessage();
    }
  };

  const isLimitReached = usage.questionsRemaining <= 0 && !usage.isPaid;

  if (!shouldShowGeoBuddy && !embedded) {
    return null;
  }
  
  if (embedded) {
    return (
      <div className="flex flex-col h-[400px]">
        {!usage.isPaid && (
          <div className="px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 flex items-center justify-between">
            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
              Free: 5 questions/month
            </span>
            <span className={`text-xs font-bold ${isLimitReached ? 'text-red-600' : 'text-orange-600'}`}>
              {usage.questionsRemaining} left
            </span>
          </div>
        )}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-orange-50 dark:bg-orange-900/30 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-orange-100 dark:border-orange-800'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2 border border-orange-100 dark:border-orange-800">
                  <div className="w-6 h-6">
                    <GeoBuddyCharacter state="chatting" size="sm" autoHide={false} />
                  </div>
                  <span className="animate-pulse text-orange-600 text-sm">{GEOBUDDY_MESSAGES.chatting.thinking}</span>
                </div>
              </motion.div>
            )}
          </div>

          {showWelcome && suggestedTopics.length > 0 && messages.length <= 1 && !isLimitReached && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking about:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleTopicClick(topic)}
                    className="text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-700"
                  >
                    {topic.emoji} {topic.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {isLimitReached && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">Monthly limit reached!</p>
              <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">Come back next month for 5 more questions</p>
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isLimitReached ? "Limit reached" : "Ask about geography..."}
              className="flex-1 text-sm"
              disabled={isLoading || isLimitReached}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !inputValue.trim() || isLimitReached}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
            className="fixed bottom-20 right-4 w-80 sm:w-96 h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden"
            data-testid="geo-buddy-panel"
          >
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12">
                    <GeoBuddyCharacter state="chatting" size="md" autoHide={false} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">GeoBuddy</h3>
                    <p className="text-white/80 text-xs">Your GeoQuest companion</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8 p-0"
                    data-testid="geo-buddy-clear"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8 p-0"
                    data-testid="geo-buddy-close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {isGeoGamesMode && (
                <div className="mt-2 bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-white/90" />
                  <span className="text-white/90 text-xs font-medium">
                    Tap a question below to learn about the app
                  </span>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                      <div className="w-6 h-6">
                        <GeoBuddyCharacter state="chatting" size="sm" autoHide={false} />
                      </div>
                      <span className="animate-pulse text-gray-500 text-sm">{GEOBUDDY_MESSAGES.chatting.thinking}</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {isGeoGamesMode && suggestedTopics.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tap a question:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => handleTopicClick(topic)}
                        className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-700 font-medium"
                        data-testid={`geo-buddy-topic-${index}`}
                      >
                        {topic.emoji} {topic.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {!isGeoGamesMode && showWelcome && suggestedTopics.length > 0 && messages.length <= 1 && !isLimitReached && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking about:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => handleTopicClick(topic)}
                        className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        data-testid={`geo-buddy-topic-${index}`}
                      >
                        {topic.emoji} {topic.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {!isGeoGamesMode && isLimitReached && (
                <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    Monthly limit reached!
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                    Come back next month for 5 more questions
                  </p>
                </div>
              )}
            </ScrollArea>

            {!isGeoGamesMode && (
              <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isLimitReached ? "Limit reached - come back next month!" : "Ask about a country, city, or game..."}
                    className="flex-1 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    disabled={isLoading || isLimitReached}
                    data-testid="geo-buddy-input"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !inputValue.trim() || isLimitReached}
                    className="bg-blue-500 hover:bg-blue-600"
                    data-testid="geo-buddy-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isDragging) setIsOpen(!isOpen);
        }}
        style={{ x: position.x, y: position.y }}
        className={`fixed bottom-20 right-4 z-50 cursor-grab active:cursor-grabbing ${
          isPulsing ? 'animate-pulse ring-4 ring-yellow-400 ring-opacity-75 rounded-full' : ''
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        data-testid="geo-buddy-button"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="w-16 h-16 bg-gradient-to-r from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-lg"
            >
              <X className="h-7 w-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-16 h-16"
              title="Ask Compass"
            >
              <GeoBuddyCharacter state="idle" size="md" autoHide={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
});

GeoBuddy.displayName = 'GeoBuddy';
