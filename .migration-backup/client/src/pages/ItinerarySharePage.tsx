import { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Calendar, Users, Eye, ThumbsUp, Globe, Compass, Sparkles, Headphones, Camera, Gamepad2, ArrowLeft, Share2, ExternalLink, Copy, Loader2, BadgeCheck, User, MessageCircle, Send, Trash2, Download, AlertTriangle, UserPlus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useExplorer } from '@/lib/explorerContext';
import { ComingSoonModal, AdventureLimitGate } from '@/components/UpgradePrompt';
import { MONTHS, YEARS } from '@/lib/travelDestinations';
import type { ItineraryShare, ItineraryShareStop, ItineraryComment } from '@shared/schema';

const STYLE_TAG_ICONS: Record<string, string> = {
  adventure: '🏔️',
  beach: '🏖️',
  cultural: '🎭',
  family: '👨‍👩‍👧',
  educational: '📚',
  nature: '🌿',
  roadtrip: '🚗',
  wildlife: '🐢',
  relaxation: '🧘',
  foodie: '🍽️',
};

interface ShareWithStops extends ItineraryShare {
  stops: ItineraryShareStop[];
}

function getVisitorId(): string {
  let visitorId = localStorage.getItem('geoquest_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('geoquest_visitor_id', visitorId);
  }
  return visitorId;
}

export default function ItinerarySharePage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useSubscription();
  
  const [share, setShare] = useState<ShareWithStops | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<ItineraryComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Inherit trip state
  const [isInheriting, setIsInheriting] = useState(false);
  
  // Coming Soon modal state
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  
  // Adventure Limit Gate state (for gating community trips)
  const [showAdventureLimitGate, setShowAdventureLimitGate] = useState(false);
  
  // GeoAdventures auth prompt for non-logged-in users
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'experience' | 'fresh' | null>(null);
  
  // Confirmation modal state for Experience This Adventure
  const [showConfirmCopy, setShowConfirmCopy] = useState(false);
  const [pendingCopyAction, setPendingCopyAction] = useState<'use' | 'inherit' | null>(null);
  
  // Traveler and date selection state for Experience This Adventure
  const [showTravelerDialog, setShowTravelerDialog] = useState(false);
  const [selectedTravelers, setSelectedTravelers] = useState<{ name: string; explorerId?: string }[]>([]);
  const [travelMonth, setTravelMonth] = useState<number | null>(null);
  const [travelYear, setTravelYear] = useState<number | null>(null);
  const [showAddTraveler, setShowAddTraveler] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');
  
  // Get explorers from context
  const { explorers } = useExplorer();
  
  // Compute available travelers (all explorers)
  const availableExplorers = useMemo(() => {
    return explorers || [];
  }, [explorers]);
  
  useEffect(() => {
    async function fetchShare() {
      try {
        const response = await fetch(`/api/travel/shares/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Itinerary not found');
          } else {
            throw new Error('Failed to load itinerary');
          }
          return;
        }
        const data = await response.json();
        setShare(data);
        setUpvoteCount(data.totalUpvotes || 0);
        
        if (data.title) {
          document.title = `${data.title} - GeoQuest Itinerary`;
        }
        
        const visitorId = getVisitorId();
        const upvoteRes = await fetch(`/api/travel/shares/${data.id}/upvote/${visitorId}`);
        if (upvoteRes.ok) {
          const { hasUpvoted: voted } = await upvoteRes.json();
          setHasUpvoted(voted);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load itinerary');
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) {
      fetchShare();
    }
    
    return () => {
      document.title = 'GeoQuest - Family Travel Education App';
    };
  }, [slug]);
  
  // Check auth and load comments
  useEffect(() => {
    async function checkAuthAndLoadComments() {
      try {
        const authRes = await fetch('/api/auth/user');
        if (authRes.ok) {
          const user = await authRes.json();
          setIsLoggedIn(true);
          setCurrentUserId(user.id);
        }
      } catch {}
      
      if (share?.id) {
        try {
          const commentsRes = await fetch(`/api/travel/shares/${share.id}/comments`);
          if (commentsRes.ok) {
            const data = await commentsRes.json();
            setComments(data);
          }
        } catch (err) {
          console.error('Error loading comments:', err);
        }
      }
    }
    
    if (share) {
      checkAuthAndLoadComments();
    }
  }, [share?.id]);
  
  const handleAddComment = async () => {
    if (!newComment.trim() || isAddingComment) return;
    
    setIsAddingComment(true);
    try {
      const res = await fetch(`/api/travel/shares/${share!.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      
      if (res.ok) {
        const comment = await res.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
        toast({ title: 'Comment added!' });
      } else if (res.status === 401) {
        toast({ title: 'Please sign in to comment', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setIsAddingComment(false);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/travel/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast({ title: 'Comment deleted' });
      }
    } catch (err) {
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  };
  
  // Handler to show confirmation modal before copying
  const handleRequestCopy = (action: 'use' | 'inherit') => {
    if (!isLoggedIn) {
      toast({ 
        title: 'Sign in required', 
        description: 'Please sign in to use this itinerary.',
        variant: 'destructive' 
      });
      return;
    }
    setPendingCopyAction(action);
    setShowConfirmCopy(true);
  };
  
  // Handler when user confirms they want to copy the adventure
  const handleConfirmCopy = async () => {
    setShowConfirmCopy(false);
    if (pendingCopyAction === 'use') {
      await handleUseItinerary();
    } else if (pendingCopyAction === 'inherit') {
      await handleInheritTrip();
    }
    setPendingCopyAction(null);
  };
  
  const handleInheritTrip = async () => {
    if (!share || isInheriting) return;
    
    if (!isLoggedIn) {
      toast({ 
        title: 'Sign in required', 
        description: 'Please sign in to use this itinerary.',
        variant: 'destructive' 
      });
      return;
    }
    
    setIsInheriting(true);
    try {
      const res = await fetch(`/api/travel/shares/${share.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const newTrip = await res.json();
        toast({ 
          title: 'Itinerary added!', 
          description: 'The itinerary has been added to your trips. You can now customize it!' 
        });
        // Navigate to GeoAdventures with the new trip ID to open it directly
        setLocation(`/geoadventures?openTrip=${newTrip.id}`);
      } else if (res.status === 401) {
        toast({ 
          title: 'Sign in required', 
          description: 'Please sign in to use this itinerary.',
          variant: 'destructive' 
        });
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add itinerary');
      }
    } catch (err: any) {
      toast({ 
        title: 'Failed to add itinerary', 
        description: err.message,
        variant: 'destructive' 
      });
    } finally {
      setIsInheriting(false);
    }
  };
  
  const handleUpvote = async () => {
    if (!share || isUpvoting) return;
    
    setIsUpvoting(true);
    try {
      const visitorId = getVisitorId();
      const response = await fetch(`/api/travel/shares/${share.id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });
      
      if (response.ok) {
        const { upvoted, totalUpvotes } = await response.json();
        setHasUpvoted(upvoted);
        setUpvoteCount(totalUpvotes);
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
    } finally {
      setIsUpvoting(false);
    }
  };
  
  // Toggle explorer selection for travelers
  const toggleExplorerTraveler = (explorer: { id: string; name: string }) => {
    setSelectedTravelers(prev => {
      const exists = prev.some(t => t.explorerId === explorer.id);
      if (exists) {
        return prev.filter(t => t.explorerId !== explorer.id);
      } else {
        return [...prev, { name: explorer.name, explorerId: explorer.id }];
      }
    });
  };
  
  // Add custom traveler (non-explorer)
  const handleAddCustomTraveler = () => {
    if (!newTravelerName.trim()) return;
    setSelectedTravelers(prev => [...prev, { name: newTravelerName.trim() }]);
    setNewTravelerName('');
    setShowAddTraveler(false);
  };
  
  // Open traveler dialog before copying
  const handleOpenTravelerDialog = () => {
    if (!isLoggedIn) {
      toast({ 
        title: 'Sign in required', 
        description: 'Please sign in to use this itinerary.',
        variant: 'destructive' 
      });
      return;
    }
    setSelectedTravelers([]);
    setTravelMonth(null);
    setTravelYear(null);
    setShowTravelerDialog(true);
  };
  
  const handleUseItinerary = async () => {
    if (!share || isCopying) return;
    
    // Validate at least one traveler selected
    if (selectedTravelers.length === 0) {
      toast({
        title: "Select travelers",
        description: "Please select at least one traveler for this adventure.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCopying(true);
    setShowTravelerDialog(false);
    try {
      const response = await fetch(`/api/travel/shares/${share.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelers: selectedTravelers,
          travelMonth: travelMonth || undefined,
          travelYear: travelYear || undefined,
        }),
      });
      
      if (response.ok) {
        const newTrip = await response.json();
        toast({
          title: "Itinerary copied!",
          description: "You can now customize this trip in GeoAdventures.",
        });
        setLocation(`/geoadventures?trip=${newTrip.id}`);
      } else if (response.status === 401) {
        toast({
          title: "Sign in required",
          description: "Please sign in to use this itinerary.",
          variant: "destructive",
        });
      } else {
        const error = await response.json();
        if (error.code === 'DUPLICATE_CITY') {
          toast({
            title: "Adventure already exists",
            description: error.message,
            variant: "destructive",
          });
        } else {
          throw new Error(error.message || 'Failed to copy itinerary');
        }
      }
    } catch (error: any) {
      console.error('Error copying itinerary:', error);
      toast({
        title: "Copy failed",
        description: error.message || "There was an error copying this itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };
  
  const handleCopyLink = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: share?.title || 'GeoQuest Adventure',
      text: `Check out this ${share?.durationDays || ''} day adventure to ${share?.destination || 'an amazing destination'}!`,
      url: shareUrl,
    };
    
    try {
      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Adventure shared successfully.",
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Share it with friends and family.",
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Share it with friends and family.",
        });
      } catch {
        toast({
          title: "Couldn't copy",
          description: "Please copy the link from your browser.",
          variant: "destructive",
        });
      }
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }
  
  if (error || !share) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Compass className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Itinerary Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This itinerary may have been unpublished or the link is incorrect.
            </p>
            <Button onClick={() => setLocation('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to GeoQuest
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/travel')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            GeoAdventures
          </Button>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm mb-1">
                <MapPin className="w-4 h-4" />
                {share.destination}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-share-title">
                  {share.title}
                </h1>
                {(share as any).isVerifiedVisit && (
                  <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 gap-1" data-testid="badge-verified">
                    <BadgeCheck className="w-3 h-3" />
                    Verified Visit
                  </Badge>
                )}
              </div>
              
              {(share as any).creatorDisplayName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span>by <span className="font-medium">{(share as any).creatorDisplayName}</span></span>
                </div>
              )}
              
              {share.description && (
                <p className="text-muted-foreground max-w-2xl" data-testid="text-share-description">
                  {share.description}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  // All users go through the gate - admins/subscribers will pass immediately
                  // The gate's onContinue callback will open the traveler dialog
                  setShowAdventureLimitGate(true);
                }}
                disabled={isCopying}
                className="bg-teal-500 hover:bg-teal-600"
                data-testid="button-use-itinerary"
              >
                {isCopying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Experience This Adventure
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                data-testid="button-copy-share-link"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {share.durationDays} days
            </div>
            {share.partySize ? (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {String(share.partySize)} travelers
              </div>
            ) : null}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {share.stops.length} stops
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {share.totalViews} views
            </div>
            <Button
              variant={hasUpvoted ? "default" : "outline"}
              size="sm"
              onClick={handleUpvote}
              disabled={isUpvoting}
              className={`gap-1 h-7 px-2 ${hasUpvoted ? 'bg-teal-500 hover:bg-teal-600' : ''}`}
              data-testid="button-upvote"
            >
              <ThumbsUp className={`w-3 h-3 ${hasUpvoted ? 'fill-current' : ''}`} />
              {upvoteCount}
            </Button>
          </div>
          
          {share.styleTags && share.styleTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {share.styleTags.map((tag) => (
                <Badge key={tag} variant="secondary" data-testid={`badge-tag-${tag}`}>
                  {STYLE_TAG_ICONS[tag] || '🏷️'} {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {(share as any).inspiredByTitle && (
            <p className="text-sm text-muted-foreground mt-3 italic">
              Inspired by: <span className="font-medium">{(share as any).inspiredByTitle}</span>
            </p>
          )}
          
          {share.bestTimeToVisit && (
            <p className="text-sm text-muted-foreground mt-3">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Best time to visit: <span className="font-medium">{share.bestTimeToVisit}</span>
            </p>
          )}
        </div>
        
        <Separator className="my-6" />
        
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-500" />
          Journey Stops
        </h2>
        
        <div className="space-y-4">
          {share.stops.map((stop, index) => (
            <Card key={stop.id} className="overflow-hidden" data-testid={`card-stop-${stop.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{stop.name}</CardTitle>
                    {stop.locationType && (
                      <p className="text-sm text-muted-foreground capitalize">{stop.locationType}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stop.listenSummary && (
                    <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Headphones className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Listen</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">{stop.listenSummary}</p>
                      </div>
                    </div>
                  )}
                  
                  {stop.wonderPrompt && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <Camera className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Wonder</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 line-clamp-2">{stop.wonderPrompt}</p>
                      </div>
                    </div>
                  )}
                  
                  {stop.journeyGameTypes && stop.journeyGameTypes.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Gamepad2 className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Games</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {stop.journeyGameTypes.length} exploration games available
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {stop.exploreHighlights && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {stop.exploreHighlights}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Separator className="my-8" />
        
        <div className="text-center py-6">
          <div className="mb-4">
            <Compass className="w-12 h-12 text-teal-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Ready for Your Own Adventure?</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Use this itinerary as a template or start fresh with your own trip!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthModalAction('experience');
                  setShowAuthModal(true);
                } else {
                  handleRequestCopy('inherit');
                }
              }}
              disabled={isInheriting}
              className="bg-teal-500 hover:bg-teal-600"
              data-testid="button-inherit-trip"
            >
              {isInheriting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Experience This Adventure
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthModalAction('fresh');
                  setShowAuthModal(true);
                } else {
                  const dest = share?.destination || share?.title || '';
                  setLocation(`/geoadventures${dest ? `?startFresh=${encodeURIComponent(dest)}` : ''}`);
                }
              }}
              data-testid="button-start-fresh"
            >
              <Globe className="w-4 h-4 mr-2" />
              Start Fresh
            </Button>
          </div>
          {!isLoggedIn && (
            <p className="text-xs text-muted-foreground mt-3">
              <button
                onClick={() => { setAuthModalAction(null); setShowAuthModal(true); }}
                className="text-teal-600 hover:underline font-medium"
                data-testid="link-sign-in"
              >
                Sign in
              </button>
              {' '}to use this itinerary
            </p>
          )}
        </div>
        
        {/* Comments Section */}
        <Separator className="my-8" />
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-teal-500" />
            Community Discussion ({comments.length})
          </h3>
          
          {/* Add Comment Form */}
          {isLoggedIn ? (
            <div className="flex gap-2">
              <Textarea
                placeholder="Share your thoughts or travel tips..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none"
                rows={2}
                maxLength={1000}
                data-testid="input-comment"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
                className="bg-teal-500 hover:bg-teal-600"
                data-testid="button-add-comment"
              >
                {isAddingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                <a href="/login" className="text-teal-600 hover:underline">Sign in</a> to join the discussion
              </CardContent>
            </Card>
          )}
          
          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id} className="bg-white dark:bg-gray-800" data-testid={`comment-${comment.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                          </span>
                          {comment.isEdited && (
                            <span className="text-xs text-muted-foreground italic">(edited)</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                      </div>
                      {currentUserId === comment.userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteComment(comment.id)}
                          data-testid={`button-delete-comment-${comment.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </div>
        
        <footer className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          <p>Created in <span className="font-medium text-teal-600">GeoQuest</span> - The Family Travel Education App</p>
        </footer>
      </div>
      
      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        featureName={comingSoonFeature}
      />
      
      {/* Adventure Limit Gate - shows Coming Soon or Pricing based on feature flag */}
      <AdventureLimitGate
        isOpen={showAdventureLimitGate}
        onClose={() => setShowAdventureLimitGate(false)}
        onContinue={handleOpenTravelerDialog}
        limitType="community"
        cityName={share?.destination}
      />

      {/* GeoAdventures Auth Modal - for non-logged-in users */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Compass className="w-7 h-7 text-white" />
            </div>
            <DialogTitle className="text-xl">Join GeoAdventures</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {authModalAction === 'experience'
                ? 'Create a free account to add this itinerary to your family travel journal and start planning!'
                : authModalAction === 'fresh'
                ? 'Create a free account to start your own family adventure to this destination!'
                : 'Sign in to plan trips, save itineraries, and journal your family adventures.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Button
              className="bg-teal-500 hover:bg-teal-600 text-white w-full"
              onClick={() => {
                setShowAuthModal(false);
                setLocation('/geoadventures');
              }}
              data-testid="button-auth-signup"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Free Account
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAuthModal(false);
                setLocation('/geoadventures');
              }}
              data-testid="button-auth-signin"
            >
              Sign In
            </Button>
            <p className="text-xs text-muted-foreground">
              Free to join · Family-safe · No credit card required
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Traveler and Date Selection Dialog */}
      <Dialog open={showTravelerDialog} onOpenChange={setShowTravelerDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-500" />
              Plan Your Adventure
            </DialogTitle>
            <DialogDescription>
              Set up "{share?.title}" for your family
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Month (optional)
                </label>
                <Select 
                  value={travelMonth?.toString() || ""} 
                  onValueChange={(val) => setTravelMonth(val ? parseInt(val) : null)}
                >
                  <SelectTrigger data-testid="select-travel-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="z-[9999] max-h-[300px]">
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">&nbsp;</label>
                <Select 
                  value={travelYear?.toString() || ""} 
                  onValueChange={(val) => setTravelYear(val ? parseInt(val) : null)}
                >
                  <SelectTrigger data-testid="select-travel-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="z-[9999] max-h-[300px]">
                    {YEARS.map(y => (
                      <SelectItem key={y.value} value={y.value.toString()}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                Who's traveling?
              </label>
              
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                {availableExplorers.map((explorer) => (
                  <label 
                    key={explorer.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Checkbox 
                      checked={selectedTravelers.some(t => t.explorerId === explorer.id)}
                      onCheckedChange={() => toggleExplorerTraveler(explorer)}
                    />
                    <span className="flex-1">{explorer.name}</span>
                  </label>
                ))}

                {selectedTravelers.filter(t => !t.explorerId).map((traveler, idx) => (
                  <div 
                    key={`custom-${idx}`}
                    className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                  >
                    <span className="text-xl">👤</span>
                    <span className="flex-1">{traveler.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-red-500"
                      onClick={() => setSelectedTravelers(prev => prev.filter(p => p.name !== traveler.name || p.explorerId))}
                    >
                      ✕
                    </Button>
                  </div>
                ))}

                {showAddTraveler ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Traveler name"
                      value={newTravelerName}
                      onChange={(e) => setNewTravelerName(e.target.value)}
                      className="flex-1"
                      data-testid="input-new-traveler-community"
                    />
                    <Button size="sm" onClick={handleAddCustomTraveler} disabled={!newTravelerName.trim()}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setShowAddTraveler(false);
                      setNewTravelerName("");
                    }}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={() => setShowAddTraveler(true)}
                    data-testid="button-add-traveler-community"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Traveler
                  </Button>
                )}
              </div>
              {selectedTravelers.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Please select at least one traveler</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowTravelerDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-teal-500 hover:bg-teal-600"
              onClick={handleUseItinerary}
              disabled={selectedTravelers.length === 0 || isCopying}
            >
              {isCopying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Start Adventure
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Experience This Adventure */}
      <AlertDialog open={showConfirmCopy} onOpenChange={setShowConfirmCopy}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-500" />
              Add This Adventure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You're about to add <strong>"{share?.title}"</strong> to your GeoAdventures.
              </p>
              <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg text-sm">
                <p className="font-medium text-teal-700 dark:text-teal-300 mb-1">What happens next:</p>
                <ul className="list-disc list-inside text-teal-600 dark:text-teal-400 space-y-1">
                  <li>This adventure will be added to your profile</li>
                  <li>You can customize stops and add your own content</li>
                  <li>All journey packs and activities will be available</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Destination: {share?.destination}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCopy}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Add to My Adventures
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
