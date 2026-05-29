import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExplorerIdentity, generateIdentityStatement, type ExplorerIdentityTraits } from '@/lib/identityTracking';
import { GeoBuddyCharacter } from './GeoBuddyCharacter';

interface ExplorerInsightCardProps {
  explorerId: string;
  explorerName?: string;
  explorerAge?: string;
  compact?: boolean;
}

export function ExplorerInsightCard({ 
  explorerId, 
  explorerName,
  explorerAge,
  compact = false 
}: ExplorerInsightCardProps) {
  const queryClient = useQueryClient();
  const [showRefreshHint, setShowRefreshHint] = useState(false);
  
  const { data: traits, isLoading, error } = useQuery<ExplorerIdentityTraits>({
    queryKey: ['identity', explorerId],
    queryFn: () => getExplorerIdentity(explorerId),
    enabled: !!explorerId,
    staleTime: 5 * 60 * 1000,
  });
  
  const generateMutation = useMutation({
    mutationFn: () => generateIdentityStatement(explorerId, explorerName, explorerAge),
    onSuccess: (data) => {
      queryClient.setQueryData(['identity', explorerId], data);
    },
  });
  
  const hasMinimumActivity = traits && (
    (traits.natureNoticing || 0) >= 2 ||
    (traits.questionAsking || 0) >= 2 ||
    (traits.culturalCuriosity || 0) >= 2 ||
    (traits.familyConnecting || 0) >= 2 ||
    (traits.worldExploring || 0) >= 2 ||
    (traits.storyTelling || 0) >= 2
  );
  
  const shouldShowCard = traits?.currentIdentityStatement || hasMinimumActivity;
  
  useEffect(() => {
    if (hasMinimumActivity && !traits?.currentIdentityStatement && !generateMutation.isPending) {
      generateMutation.mutate();
    }
  }, [hasMinimumActivity, traits?.currentIdentityStatement, generateMutation.isPending]);
  
  if (isLoading) return null;
  if (error || !shouldShowCard) return null;
  
  const statement = traits?.currentIdentityStatement || "You're becoming a curious explorer of the world.";
  
  const handleRefresh = () => {
    generateMutation.mutate();
    setShowRefreshHint(false);
  };
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg"
      >
        <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
        <p className="text-sm text-purple-700 dark:text-purple-300 italic">
          {statement}
        </p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-amber-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-xl p-4 shadow-lg border border-amber-200/50 dark:border-amber-700/30"
      onMouseEnter={() => setShowRefreshHint(true)}
      onMouseLeave={() => setShowRefreshHint(false)}
    >
      <div className="absolute -top-3 -right-3">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <GeoBuddyCharacter state="idle" size="sm" autoHide={false} />
        </motion.div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center shadow-md shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              Explorer Insight
            </h4>
            <AnimatePresence>
              {showRefreshHint && !generateMutation.isPending && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleRefresh}
                  className="p-1 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  title="Generate new insight"
                >
                  <RefreshCw className="w-3 h-3 text-purple-400" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          <p className="text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
            {generateMutation.isPending ? (
              <span className="flex items-center gap-2 text-purple-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Discovering who you're becoming...
              </span>
            ) : (
              statement
            )}
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 rounded-b-xl opacity-50" />
    </motion.div>
  );
}
