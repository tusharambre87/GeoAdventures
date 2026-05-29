import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, MapPin, Users, Calendar, Tag, Loader2, Globe, Copy, Check, ExternalLink, Mail, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TravelTrip } from '@shared/schema';

const STYLE_TAGS = [
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'beach', label: 'Beach', icon: '🏖️' },
  { id: 'cultural', label: 'Cultural', icon: '🎭' },
  { id: 'family', label: 'Family-Friendly', icon: '👨‍👩‍👧' },
  { id: 'educational', label: 'Educational', icon: '📚' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'roadtrip', label: 'Road Trip', icon: '🚗' },
  { id: 'wildlife', label: 'Wildlife', icon: '🐢' },
  { id: 'relaxation', label: 'Relaxation', icon: '🧘' },
  { id: 'foodie', label: 'Food & Drink', icon: '🍽️' },
];

interface ShareItineraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TravelTrip;
  stopCount: number;
  existingShare?: {
    id: string;
    slug: string;
    status: string;
    totalViews: number;
    totalUpvotes: number;
    publishedAt: Date | null;
  } | null;
  onShare: (data: ShareData) => Promise<{ slug: string }>;
  onUnshare: () => Promise<void>;
}

export interface ShareData {
  title?: string;
  description?: string;
  durationDays: number;
  partySize?: number;
  styleTags: string[];
  bestTimeToVisit?: string;
}

export function ShareItineraryModal({
  open,
  onOpenChange,
  trip,
  stopCount,
  existingShare,
  onShare,
  onUnshare,
}: ShareItineraryModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'community' | 'email'>('email');
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  
  const [title, setTitle] = useState(trip.name || `${trip.destination} Adventure`);
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [partySize, setPartySize] = useState<number | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [bestTimeToVisit, setBestTimeToVisit] = useState('');
  
  const [recipientEmail, setRecipientEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  
  const isPublished = existingShare?.status === 'published';
  const shareUrl = existingShare ? `${window.location.origin}/itinerary/${existingShare.slug}` : '';
  
  const handleToggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : prev.length < 5 ? [...prev, tagId] : prev
    );
  };
  
  const handlePublish = async (isUpdate = false) => {
    if (!durationDays || durationDays < 1) {
      toast({
        title: "Duration required",
        description: "Please enter how many days this adventure took.",
        variant: "destructive",
      });
      return;
    }
    
    // If already published and not confirmed, show confirmation
    if (isPublished && !isUpdate) {
      setShowUpdateConfirm(true);
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await onShare({
        title: title || undefined,
        description: description || undefined,
        durationDays,
        partySize: partySize || undefined,
        styleTags: selectedTags,
        bestTimeToVisit: bestTimeToVisit || undefined,
      });
      
      if (!isUpdate) {
        setJustPublished(true);
      }
      toast({
        title: isUpdate ? "Itinerary updated!" : "Itinerary published!",
        description: isUpdate ? "Your changes are now live." : "Your adventure is now visible in the community.",
      });
      setShowUpdateConfirm(false);
    } catch (error: any) {
      toast({
        title: isUpdate ? "Failed to update" : "Failed to publish",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnpublish = async (confirmed = false) => {
    if (!confirmed) {
      setShowUnpublishConfirm(true);
      return;
    }
    
    setIsLoading(true);
    try {
      await onUnshare();
      setShowUnpublishConfirm(false);
      toast({
        title: "Itinerary unpublished",
        description: "Your adventure is no longer visible to others.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to unpublish",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Share it with friends and family.",
      });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };
  
  const handleEmailShare = async () => {
    if (!recipientEmail) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/travel/trips/${trip.id}/share-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          personalMessage: personalMessage || undefined,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Email sent!",
          description: `Itinerary shared with ${recipientEmail}`,
        });
        setRecipientEmail('');
        setPersonalMessage('');
        onOpenChange(false);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send email');
      }
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setJustPublished(false);
          setShowUpdateConfirm(false);
          setShowUnpublishConfirm(false);
        }
        onOpenChange(isOpen);
      }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-teal-500" />
            Share Itinerary
          </DialogTitle>
          <DialogDescription>
            Share your {trip.destination} adventure with friends or the community.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'community' | 'email')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2" data-testid="tab-email">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2" data-testid="tab-community">
              <Globe className="w-4 h-4" />
              Community
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{stopCount} stops in {trip.destination} will be shared</span>
            </div>

            {isPublished && shareUrl ? (
              <div className="space-y-2">
                <Label>Quick Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="text-sm"
                    data-testid="input-email-share-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    data-testid="button-email-copy-link"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  Want a shareable link?
                </p>
                <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                  Publish to the Community tab to get a link you can copy and share anywhere.
                </p>
              </div>
            )}

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-3 text-xs text-muted-foreground">or send by email</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="friend@example.com"
                data-testid="input-email-recipient"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Check out our amazing adventure!"
                rows={3}
                data-testid="input-email-message"
              />
            </div>
            
            <Button
              onClick={handleEmailShare}
              disabled={isLoading || !recipientEmail}
              className="w-full bg-teal-500 hover:bg-teal-600"
              data-testid="button-send-email"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Email
            </Button>
          </TabsContent>
          
          <TabsContent value="community" className="space-y-4 py-4">
            {isPublished ? (
              <div className="space-y-4">
                {justPublished ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="text-4xl">🎉</div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                      Thank you for sharing your adventure!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You're helping other families discover amazing destinations. Your adventure is now visible in the community!
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-green-700 dark:text-green-400">Published</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{existingShare?.totalViews || 0} views</span>
                      <span>{existingShare?.totalUpvotes || 0} upvotes</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={shareUrl} 
                      readOnly 
                      className="text-sm"
                      data-testid="input-share-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                      data-testid="button-copy-link"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(shareUrl, '_blank')}
                      data-testid="button-view-share"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {showUpdateConfirm ? (
                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-3">
                    <p className="text-sm font-medium">Update Published Trip?</p>
                    <p className="text-sm text-muted-foreground">
                      Your existing views and upvotes will be preserved.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUpdateConfirm(false)}
                        disabled={isLoading}
                        data-testid="button-cancel-update"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handlePublish(true)}
                        disabled={isLoading}
                        className="bg-teal-500 hover:bg-teal-600"
                        data-testid="button-confirm-update"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Yes, Update Trip
                      </Button>
                    </div>
                  </div>
                ) : showUnpublishConfirm ? (
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 space-y-3">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Unpublish from Community?</p>
                    <p className="text-sm text-muted-foreground">
                      Your trip will no longer be visible to other explorers.
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      By unpublishing, you won't be helping other families discover this amazing destination.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnpublishConfirm(false)}
                        disabled={isLoading}
                        data-testid="button-cancel-unpublish"
                      >
                        Keep Published
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUnpublish(true)}
                        disabled={isLoading}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        data-testid="button-confirm-unpublish"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Yes, Unpublish
                      </Button>
                    </div>
                  </div>
                ) : justPublished ? (
                  <div className="space-y-3 pt-2 border-t">
                    <Button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="w-full bg-teal-500 hover:bg-teal-600"
                      data-testid="button-close-modal"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Done
                    </Button>
                    
                    <button
                      type="button"
                      onClick={() => setShowUnpublishConfirm(true)}
                      disabled={isLoading}
                      className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors py-1"
                      data-testid="button-unpublish-small"
                    >
                      Changed your mind? Unpublish
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="pt-2 border-t space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Added new stops? Update your published trip to share the changes.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setShowUpdateConfirm(true)}
                        disabled={isLoading}
                        className="w-full bg-teal-500 hover:bg-teal-600"
                        data-testid="button-update-share"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Update Published Trip
                      </Button>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUnpublishConfirm(true)}
                      disabled={isLoading}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid="button-unpublish"
                    >
                      Unpublish from Community
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{stopCount} stops in {trip.destination} will be shared publicly</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Our Big Island Adventure"
                    data-testid="input-share-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A magical week exploring volcanoes, beaches, and sea turtles..."
                    rows={2}
                    data-testid="input-share-description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Trip Duration *
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        max={365}
                        value={durationDays}
                        onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                        className="w-20"
                        data-testid="input-duration-days"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partySize" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Party Size (optional)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="partySize"
                        type="number"
                        min={1}
                        max={50}
                        value={partySize || ''}
                        onChange={(e) => setPartySize(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-20"
                        data-testid="input-party-size"
                      />
                      <span className="text-sm text-muted-foreground">people</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Style Tags (up to 5)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_TAGS.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          selectedTags.includes(tag.id) 
                            ? 'bg-teal-500 hover:bg-teal-600' 
                            : 'hover:bg-teal-50 dark:hover:bg-teal-900/20'
                        }`}
                        onClick={() => handleToggleTag(tag.id)}
                        data-testid={`tag-${tag.id}`}
                      >
                        {tag.icon} {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bestTime">Best Time to Visit (optional)</Label>
                  <Input
                    id="bestTime"
                    value={bestTimeToVisit}
                    onChange={(e) => setBestTimeToVisit(e.target.value)}
                    placeholder="e.g., Spring or Fall"
                    data-testid="input-best-time"
                  />
                </div>
                
                <Button
                  onClick={() => handlePublish()}
                  disabled={isLoading || !durationDays}
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  data-testid="button-publish"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                  Publish to Community
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Your photos and personal notes will never be shared.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    
    </>
  );
}
