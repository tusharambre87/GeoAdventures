import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Star, Settings, ArrowRight, Home, ArrowLeft, Pencil, X, Check, Trash2, Archive, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExplorer } from '@/lib/explorerContext';
import { useUser } from '@/lib/userContext';
import { useToast } from '@/hooks/use-toast';
import type { Player } from '@shared/schema';
import { getExplorerRank } from '@shared/schema';
import { GlobeLoader } from '@/components/GlobeLoader';

const AVATAR_OPTIONS = [
  { key: 'panda', emoji: '🐼', name: 'Panda' },
  { key: 'lion', emoji: '🦁', name: 'Lion' },
  { key: 'elephant', emoji: '🐘', name: 'Elephant' },
  { key: 'penguin', emoji: '🐧', name: 'Penguin' },
  { key: 'koala', emoji: '🐨', name: 'Koala' },
  { key: 'fox', emoji: '🦊', name: 'Fox' },
  { key: 'owl', emoji: '🦉', name: 'Owl' },
  { key: 'turtle', emoji: '🐢', name: 'Turtle' },
  { key: 'butterfly', emoji: '🦋', name: 'Butterfly' },
  { key: 'dolphin', emoji: '🐬', name: 'Dolphin' },
  { key: 'rocket', emoji: '🚀', name: 'Rocket' },
  { key: 'globe', emoji: '🌍', name: 'Globe' },
];

function getAvatarEmoji(key: string): string {
  const avatar = AVATAR_OPTIONS.find(a => a.key === key);
  return avatar?.emoji || '🐼';
}

const AGE_RANGE_OPTIONS = [
  { value: '4-6', label: '4-6 years' },
  { value: '7-9', label: '7-9 years' },
  { value: '10-12', label: '10-12 years' },
  { value: '13+', label: '13+ years' },
  { value: 'adult', label: 'Adult' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', description: 'Simple questions, more hints' },
  { value: 'medium', label: 'Medium', description: 'Balanced challenge' },
  { value: 'hard', label: 'Hard', description: 'Challenging questions' },
];

function ExplorerCard({ 
  explorer, 
  onSelect, 
  onEdit,
  onArchive,
  onDelete,
  isSelected 
}: { 
  explorer: Player; 
  onSelect: () => void; 
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isSelected: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/90 shadow-sm hover:bg-gray-100 rounded-full w-6 h-6"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          data-testid={`edit-explorer-${explorer.id}`}
        >
          <Pencil className="w-3 h-3 text-gray-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/90 shadow-sm hover:bg-orange-50 rounded-full w-6 h-6"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          data-testid={`archive-explorer-${explorer.id}`}
        >
          <Archive className="w-3 h-3 text-orange-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/90 shadow-sm hover:bg-red-50 rounded-full w-6 h-6"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          data-testid={`delete-explorer-${explorer.id}`}
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </Button>
      </div>
      <Card
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'ring-4 ring-yellow-400 bg-gradient-to-br from-yellow-100 to-orange-100' 
            : 'hover:shadow-lg bg-white'
        }`}
        onClick={onSelect}
        data-testid={`explorer-card-${explorer.id}`}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="text-6xl mb-3">
            {getAvatarEmoji(explorer.avatarKey || 'panda')}
          </div>
          <h3 className="text-xl font-bold text-gray-800 font-fredoka mb-1">
            {explorer.name}
          </h3>
          {(() => {
            const rankInfo = getExplorerRank(explorer.totalXp || 0);
            return (
              <>
                <div className="flex items-center gap-1 text-amber-600 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium" data-testid={`xp-${explorer.id}`}>
                    {(explorer.totalXp || 0).toLocaleString()} XP
                  </span>
                </div>
                <div className="text-xs text-gray-500" data-testid={`rank-${explorer.id}`}>
                  {rankInfo.rank.icon} {rankInfo.rank.name}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EditExplorerDialog({
  explorer,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  explorer: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { name?: string; avatarKey?: string; ageRange?: string; difficultyLevel?: string }) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(explorer?.name || '');
  const [avatarKey, setAvatarKey] = useState(explorer?.avatarKey || 'panda');
  const [ageRange, setAgeRange] = useState(explorer?.ageRange || '7-9');
  const [difficultyLevel, setDifficultyLevel] = useState(explorer?.difficultyLevel || 'medium');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (explorer) {
      setName(explorer.name || '');
      setAvatarKey(explorer.avatarKey || 'panda');
      setAgeRange(explorer.ageRange || '7-9');
      setDifficultyLevel(explorer.difficultyLevel || 'medium');
    }
  }, [explorer]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ name, avatarKey, ageRange, difficultyLevel });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!explorer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-fredoka text-2xl">Edit Explorer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Explorer name"
              className="text-lg"
              data-testid="edit-explorer-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setAvatarKey(avatar.key)}
                  className={`w-12 h-12 rounded-lg text-2xl flex items-center justify-center transition-all ${
                    avatarKey === avatar.key
                      ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  data-testid={`avatar-option-${avatar.key}`}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Age Range</Label>
            <div className="grid grid-cols-3 gap-2">
              {AGE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAgeRange(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    ageRange === option.value
                      ? 'bg-green-100 ring-2 ring-green-500 text-green-800'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                  data-testid={`age-option-${option.value}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Difficulty Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDifficultyLevel(option.value)}
                  className={`px-3 py-3 rounded-lg text-center transition-all ${
                    difficultyLevel === option.value
                      ? 'bg-purple-100 ring-2 ring-purple-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  data-testid={`difficulty-option-${option.value}`}
                >
                  <span className="font-medium text-sm">{option.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              onClose();
              onDelete();
            }}
            disabled={isSaving}
            className="bg-red-500 hover:bg-red-600"
            data-testid="delete-explorer-button"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Explorer
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              data-testid="cancel-edit-explorer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="save-explorer"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddExplorerCard({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 border-2 border-dashed ${
          disabled 
            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' 
            : 'border-blue-300 hover:border-blue-500 hover:shadow-lg bg-blue-50/50'
        }`}
        onClick={disabled ? undefined : onClick}
        data-testid="add-explorer-card"
      >
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[180px]">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <Plus className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-blue-600 font-fredoka">
            Add Explorer
          </h3>
          {disabled && (
            <p className="text-xs text-gray-400 mt-1">Maximum reached</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ParentalLockDialog({
  isOpen,
  onClose,
  onSuccess,
  explorerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (challengeData: { token: string; answer: number }) => void;
  explorerName: string;
}) {
  const [challenge, setChallenge] = useState<{ a: number; b: number; token: string } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserAnswer('');
      setError(false);
      setLoading(true);
      fetch('/api/parental-challenge')
        .then(res => res.json())
        .then(data => {
          setChallenge(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!challenge) return;
    const answer = parseInt(userAnswer);
    if (answer === challenge.a + challenge.b) {
      onSuccess({ token: challenge.token, answer });
    } else {
      setError(true);
      setUserAnswer('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-fredoka text-xl text-center">
            Parental Verification
          </DialogTitle>
          <DialogDescription className="text-center">
            To delete {explorerName}'s profile, please solve this math problem:
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 text-center">
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : challenge ? (
            <>
              <p className="text-3xl font-bold text-gray-800 mb-4">
                {challenge.a} + {challenge.b} = ?
              </p>
              <Input
                type="number"
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your answer"
                className={`text-center text-xl ${error ? 'border-red-500' : ''}`}
                data-testid="parental-lock-answer"
              />
              {error && (
                <p className="text-red-500 text-sm mt-2">
                  Incorrect answer. Please try again.
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500">Failed to load challenge. Please try again.</p>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="parental-lock-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!userAnswer || loading || !challenge}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
            data-testid="parental-lock-submit"
          >
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  explorerName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  explorerName: string;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-fredoka text-xl text-center text-red-600">
            Delete Explorer?
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-700">
            Are you sure you want to delete <span className="font-bold">{explorerName}</span>?
          </p>
          <p className="text-gray-500 text-sm mt-2">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
            data-testid="delete-confirm-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-500 hover:bg-red-600"
            data-testid="delete-confirm-button"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WhosPlaying() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { 
    explorers, 
    activeExplorer, 
    setActiveExplorer, 
    loadExplorers, 
    isLoading 
  } = useExplorer();
  const { toast } = useToast();
  const [selectedExplorer, setSelectedExplorer] = useState<Player | null>(null);
  const [editingExplorer, setEditingExplorer] = useState<Player | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [deletingExplorer, setDeletingExplorer] = useState<Player | null>(null);
  const [isParentalLockOpen, setIsParentalLockOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verifiedChallenge, setVerifiedChallenge] = useState<{ token: string; answer: number } | null>(null);
  
  const [archivingExplorer, setArchivingExplorer] = useState<Player | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadExplorers(user.id);
    }
  }, [user?.id, loadExplorers]);

  const handleSelectExplorer = (explorer: Player) => {
    setSelectedExplorer(explorer);
  };

  const handleStartPlaying = () => {
    if (selectedExplorer) {
      setActiveExplorer(selectedExplorer);
      navigate('/');
    }
  };

  const handleAddExplorer = () => {
    navigate('/add-explorer');
  };

  const handleEditExplorer = (explorer: Player) => {
    setEditingExplorer(explorer);
    setIsEditDialogOpen(true);
  };

  const handleSaveExplorer = async (updates: { name?: string; avatarKey?: string; ageRange?: string; difficultyLevel?: string }) => {
    if (!editingExplorer) return;
    
    try {
      const response = await fetch(`/api/explorers/${editingExplorer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update explorer');
      }
      
      toast({
        title: 'Profile Updated',
        description: `${updates.name || editingExplorer.name}'s profile has been saved.`,
      });
      
      if (user?.id) {
        loadExplorers(user.id);
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Could not save changes. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleParentDashboard = () => {
    navigate('/parent-dashboard');
  };

  const handleInitiateDelete = (explorer: Player) => {
    setDeletingExplorer(explorer);
    setIsParentalLockOpen(true);
  };

  const handleParentalLockSuccess = (challengeData: { token: string; answer: number }) => {
    setVerifiedChallenge(challengeData);
    setIsParentalLockOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExplorer || !verifiedChallenge) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/explorers/${deletingExplorer.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentalChallenge: verifiedChallenge,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete explorer');
      }
      
      toast({
        title: 'Explorer Deleted',
        description: `${deletingExplorer.name} has been permanently removed.`,
      });
      
      if (selectedExplorer?.id === deletingExplorer.id) {
        setSelectedExplorer(null);
      }
      
      if (activeExplorer?.id === deletingExplorer.id) {
        setActiveExplorer(null);
      }
      
      if (user?.id) {
        loadExplorers(user.id);
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Could not delete explorer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setDeletingExplorer(null);
      setVerifiedChallenge(null);
    }
  };

  const handleCancelDelete = () => {
    setIsParentalLockOpen(false);
    setIsDeleteConfirmOpen(false);
    setDeletingExplorer(null);
    setVerifiedChallenge(null);
  };

  const handleInitiateArchive = (explorer: Player) => {
    setArchivingExplorer(explorer);
    setIsArchiveDialogOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!archivingExplorer) return;
    
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/explorers/${archivingExplorer.id}/archive`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive explorer');
      }
      
      toast({
        title: 'Explorer Archived',
        description: `${archivingExplorer.name} has been archived. Tap to restore from Parent Dashboard.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/parent-dashboard')}
            data-testid="toast-go-to-dashboard"
          >
            Go to Dashboard
          </Button>
        ),
      });
      
      if (selectedExplorer?.id === archivingExplorer.id) {
        setSelectedExplorer(null);
      }
      
      if (activeExplorer?.id === archivingExplorer.id) {
        setActiveExplorer(null);
      }
      
      if (user?.id) {
        loadExplorers(user.id);
      }
    } catch (error) {
      toast({
        title: 'Archive Failed',
        description: 'Could not archive explorer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
      setIsArchiveDialogOpen(false);
      setArchivingExplorer(null);
    }
  };

  const handleCancelArchive = () => {
    setIsArchiveDialogOpen(false);
    setArchivingExplorer(null);
  };

  const canAddMore = explorers.length < 5;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-green-300 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl font-fredoka">Please sign in to continue</p>
          <Button 
            className="mt-4"
            onClick={() => window.location.href = '/api/login'}
            data-testid="signin-button"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-green-300 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/20"
            data-testid="back-button"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20"
              data-testid="home-button"
            >
              <Home className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleParentDashboard}
              className="text-white hover:bg-white/20"
              data-testid="settings-button"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white font-fredoka drop-shadow-lg mb-2">
            Who's Playing?
          </h1>
          <p className="text-white/80 text-lg">
            Choose your explorer to start the adventure!
          </p>
        </motion.div>

        {isLoading ? (
          <div className="py-12">
            <GlobeLoader message="Finding your explorers..." size="lg" />
          </div>
        ) : explorers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold text-white mb-2 font-fredoka">
              No Explorers Yet!
            </h2>
            <p className="text-white/80 mb-6">
              Create your first explorer to start the adventure
            </p>
            <Button
              size="lg"
              onClick={handleAddExplorer}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold"
              data-testid="create-first-explorer-button"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Explorer
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <AnimatePresence>
                {explorers.map((explorer, index) => (
                  <motion.div
                    key={explorer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ExplorerCard
                      explorer={explorer}
                      onSelect={() => handleSelectExplorer(explorer)}
                      onEdit={() => handleEditExplorer(explorer)}
                      onArchive={() => handleInitiateArchive(explorer)}
                      onDelete={() => handleInitiateDelete(explorer)}
                      isSelected={selectedExplorer?.id === explorer.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <AddExplorerCard onClick={handleAddExplorer} disabled={!canAddMore} />
            </div>

            <AnimatePresence>
              {selectedExplorer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm shadow-lg border-t"
                >
                  <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {getAvatarEmoji(selectedExplorer.avatarKey || 'panda')}
                      </span>
                      <div>
                        <p className="font-bold text-gray-800 font-fredoka">
                          {selectedExplorer.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Ready to play!
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={handleStartPlaying}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold gap-2"
                      data-testid="start-playing-button"
                    >
                      Let's Go!
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed top-4 right-4 flex gap-2"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="bg-white/20 hover:bg-white/30 text-white"
            data-testid="home-button"
          >
            <Home className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleParentDashboard}
            className="bg-white/20 hover:bg-white/30 text-white"
            data-testid="parent-dashboard-button"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      <EditExplorerDialog
        explorer={editingExplorer}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingExplorer(null);
        }}
        onSave={handleSaveExplorer}
        onDelete={() => editingExplorer && handleInitiateDelete(editingExplorer)}
      />

      <ParentalLockDialog
        isOpen={isParentalLockOpen}
        onClose={handleCancelDelete}
        onSuccess={handleParentalLockSuccess}
        explorerName={deletingExplorer?.name || ''}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        explorerName={deletingExplorer?.name || ''}
        isDeleting={isDeleting}
      />

      <Dialog open={isArchiveDialogOpen} onOpenChange={(open) => !open && handleCancelArchive()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-orange-500" />
              Archive Explorer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {archivingExplorer?.name}? 
              Their progress will be saved but they won't appear in "Who's Playing" anymore.
              You can restore them later from the Parent Dashboard.
            </DialogDescription>
          </DialogHeader>
          {archivingExplorer && (
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-4xl">{getAvatarEmoji(archivingExplorer.avatarKey || 'panda')}</div>
              <div>
                <p className="font-bold text-gray-800">{archivingExplorer.name}</p>
                <p className="text-sm text-gray-600">
                  {archivingExplorer.starsEarnedTotal || 0} stars • {archivingExplorer.gamesPlayed || 0} games
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelArchive}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmArchive}
              disabled={isArchiving}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-confirm-archive"
            >
              {isArchiving ? 'Archiving...' : 'Archive Explorer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
