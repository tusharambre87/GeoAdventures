import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Calendar, Users, Eye, ThumbsUp, Globe, Compass, Search, ArrowLeft, Loader2, ChevronRight, Bookmark, BookmarkCheck, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ItineraryShare } from '@shared/schema';
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";

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

const POPULAR_DESTINATIONS = [
  'Hawaii',
  'Japan',
  'Italy',
  'France',
  'Costa Rica',
  'Iceland',
  'Australia',
  'Thailand',
];

export default function BrowseItineraries() {
  const [, setLocation] = useLocation();
  const [shares, setShares] = useState<ItineraryShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [familySizeFilter, setFamilySizeFilter] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/user');
        setIsLoggedIn(res.ok);
        if (res.ok) {
          const bookmarksRes = await fetch('/api/travel/bookmarks');
          if (bookmarksRes.ok) {
            const bookmarks = await bookmarksRes.json();
            setBookmarkedIds(new Set(bookmarks.map((b: any) => b.shareId)));
          }
        }
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);
  
  useEffect(() => {
    async function fetchShares() {
      try {
        const response = await fetch('/api/travel/shares?limit=50');
        if (response.ok) {
          const data = await response.json();
          setShares(data);
        }
      } catch (error) {
        console.error('Error fetching itineraries:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShares();
  }, []);
  
  const handleBookmark = async (e: React.MouseEvent, shareId: string) => {
    e.stopPropagation();
    if (!isLoggedIn) return;
    
    const isBookmarked = bookmarkedIds.has(shareId);
    try {
      if (isBookmarked) {
        await fetch(`/api/travel/bookmarks/${shareId}`, { method: 'DELETE' });
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(shareId);
          return next;
        });
      } else {
        await fetch('/api/travel/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareId }),
        });
        setBookmarkedIds(prev => new Set(Array.from(prev).concat(shareId)));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };
  
  const filteredShares = useMemo(() => {
    let result = [...shares];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(share => 
        share.title?.toLowerCase().includes(query) ||
        share.destination?.toLowerCase().includes(query) ||
        share.description?.toLowerCase().includes(query)
      );
    }
    
    if (selectedTag !== 'all') {
      result = result.filter(share => 
        share.styleTags?.includes(selectedTag)
      );
    }
    
    if (durationFilter !== 'all') {
      result = result.filter(share => {
        const days = share.durationDays || 0;
        switch (durationFilter) {
          case 'weekend': return days <= 3;
          case 'week': return days >= 4 && days <= 7;
          case 'extended': return days >= 8 && days <= 14;
          case 'long': return days > 14;
          default: return true;
        }
      });
    }
    
    if (familySizeFilter !== 'all') {
      result = result.filter(share => {
        const partySize = share.partySize as { adults?: number; kids?: number } | null;
        if (!partySize) return familySizeFilter === 'any';
        const total = (partySize.adults || 0) + (partySize.kids || 0);
        switch (familySizeFilter) {
          case 'small': return total <= 3;
          case 'medium': return total >= 4 && total <= 5;
          case 'large': return total >= 6;
          default: return true;
        }
      });
    }
    
    result.sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.totalUpvotes || 0) - (a.totalUpvotes || 0);
      } else if (sortBy === 'views') {
        return (b.totalViews || 0) - (a.totalViews || 0);
      }
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });
    
    return result;
  }, [shares, searchQuery, selectedTag, sortBy, durationFilter, familySizeFilter]);
  
  const uniqueDestinations = useMemo(() => {
    const destinations = new Set(shares.map(s => s.destination).filter(Boolean));
    return Array.from(destinations).slice(0, 8);
  }, [shares]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setInternalNavToAdventures(); setLocation('/geoadventures'); }}
            className="mb-4"
            data-testid="button-back-travel"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to GeoAdventures
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-teal-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Community Itineraries
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Discover amazing family trips shared by other explorers. Find inspiration for your next adventure!
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search destinations, trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-itineraries"
            />
          </div>
          
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-style-tag">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Styles</SelectItem>
              {Object.entries(STYLE_TAG_ICONS).map(([id, icon]) => (
                <SelectItem key={id} value={id}>
                  {icon} {id.charAt(0).toUpperCase() + id.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Liked</SelectItem>
              <SelectItem value="views">Most Viewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <Select value={durationFilter} onValueChange={setDurationFilter}>
            <SelectTrigger className="w-32" data-testid="select-duration">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Duration</SelectItem>
              <SelectItem value="weekend">Weekend (1-3 days)</SelectItem>
              <SelectItem value="week">Week (4-7 days)</SelectItem>
              <SelectItem value="extended">Extended (8-14 days)</SelectItem>
              <SelectItem value="long">Long (15+ days)</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={familySizeFilter} onValueChange={setFamilySizeFilter}>
            <SelectTrigger className="w-32" data-testid="select-family-size">
              <Users className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Family Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Size</SelectItem>
              <SelectItem value="small">Small (1-3)</SelectItem>
              <SelectItem value="medium">Medium (4-5)</SelectItem>
              <SelectItem value="large">Large (6+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {!loading && shares.length > 0 && uniqueDestinations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Popular Destinations</h2>
            <div className="flex flex-wrap gap-2">
              {uniqueDestinations.map((dest) => (
                <Badge
                  key={dest}
                  variant={searchQuery === dest ? "default" : "outline"}
                  className="cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/30"
                  onClick={() => setSearchQuery(searchQuery === dest ? '' : dest || '')}
                  data-testid={`badge-destination-${dest}`}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {dest}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
            <p className="text-muted-foreground">Loading community itineraries...</p>
          </div>
        ) : filteredShares.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Compass className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {shares.length === 0 ? 'No Itineraries Yet' : 'No Matches Found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {shares.length === 0 
                  ? 'Be the first to share your travel adventure with the community!'
                  : 'Try adjusting your search or filters.'
                }
              </p>
              {shares.length === 0 && (
                <Button 
                  onClick={() => { setInternalNavToAdventures(); setLocation('/geoadventures'); }}
                  className="bg-teal-500 hover:bg-teal-600"
                  data-testid="button-create-trip"
                >
                  Create Your First Trip
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredShares.map((share, index) => (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="h-full hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setLocation(`/itinerary/${share.slug}`)}
                    data-testid={`card-itinerary-${share.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3" />
                            {share.destination}
                          </p>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg group-hover:text-teal-600 transition-colors line-clamp-2">
                              {share.title}
                            </CardTitle>
                            {(share as any).isVerifiedVisit && (
                              <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isLoggedIn && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => handleBookmark(e, share.id)}
                              data-testid={`button-bookmark-${share.id}`}
                            >
                              {bookmarkedIds.has(share.id) ? (
                                <BookmarkCheck className="w-4 h-4 text-teal-500" />
                              ) : (
                                <Bookmark className="w-4 h-4 text-muted-foreground hover:text-teal-500" />
                              )}
                            </Button>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-teal-500 transition-colors flex-shrink-0" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {share.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {share.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {share.durationDays} days
                        </span>
                        {share.partySize ? (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {String(share.partySize)}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {share.totalViews || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {share.totalUpvotes || 0}
                        </span>
                      </div>
                      
                      {share.styleTags && share.styleTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {share.styleTags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {STYLE_TAG_ICONS[tag] || '🏷️'}
                            </Badge>
                          ))}
                          {share.styleTags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{share.styleTags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
