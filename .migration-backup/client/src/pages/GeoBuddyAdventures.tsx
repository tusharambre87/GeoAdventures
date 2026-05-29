import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Headphones, CheckCircle, Sparkles, Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeoBuddyCharacter } from "@/components/GeoBuddyCharacter";
import { getCityImage } from "@/lib/cityImages";

interface StoryCard {
  id: string;
  cityId: string;
  title: string;
  subtitle: string;
  seasonNumber: number;
  episodeNumber: number;
  durationSeconds: number;
  summary: string;
  releaseDate: string;
  isReleased: boolean;
  coverImageUrl: string | null;
  cityName: string | null;
  countryName: string | null;
  cityFlag: string | null;
  cityImageUrl: string | null;
}

interface NextEpisode {
  id: string;
  title: string;
  subtitle: string;
  seasonNumber: number;
  episodeNumber: number;
  durationSeconds: number;
  summary: string;
  releaseDate: string;
  coverImageUrl: string | null;
  cityImageUrl: string | null;
}

interface StoriesResponse {
  stories: StoryCard[];
  completedStoryIds: string[];
  nextEpisode: NextEpisode | null;
}

export default function GeoBuddyAdventures() {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<StoriesResponse>({
    queryKey: ["/api/stories"],
    queryFn: async () => {
      const res = await fetch("/api/stories");
      if (!res.ok) throw new Error("Failed to fetch stories");
      return res.json();
    },
  });

  const stories = data?.stories || [];
  const completedIds = new Set(data?.completedStoryIds || []);
  const nextEpisode = data?.nextEpisode || null;

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  const isNewStory = (releaseDate: string) => {
    const released = new Date(releaseDate);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return released >= sevenDaysAgo;
  };

  const getTimeUntilRelease = (releaseDate: string) => {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffMs = release.getTime() - now.getTime();
    if (diffMs <= 0) return "Available now";
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    const weeks = Math.ceil(diffDays / 7);
    return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
  };

  const formatReleaseDay = (releaseDate: string) => {
    const date = new Date(releaseDate);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-purple-100 dark:border-gray-700">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              navigate(params.get('from') === 'explore' ? '/explore' : '/');
            }}
            className="rounded-full"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <GeoBuddyCharacter pose="waving" size="sm" />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" data-testid="text-page-title">
                GeoBuddy Adventures
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Season 1 — Audio stories from around the world</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {stories.length === 0 ? (
          <div className="text-center py-16">
            <GeoBuddyCharacter pose="thinking" size="lg" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-4">
              Adventures Coming Soon!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              GeoBuddy is preparing amazing stories for you.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <Headphones className="w-4 h-4 inline mr-1" />
                {stories.length} {stories.length === 1 ? "episode" : "episodes"} available
                {completedIds.size > 0 && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5 inline mr-0.5" />
                    {completedIds.size} discovered
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-4">
              {stories.map((story, index) => {
                const isCompleted = completedIds.has(story.id);
                const isNew = isNewStory(story.releaseDate);
                const cityImage = story.cityImageUrl || (story.cityName ? getCityImage(story.cityName, "") : null);

                return (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/stories/${story.id}`)}
                    className="relative overflow-hidden rounded-2xl shadow-md cursor-pointer group active:scale-[0.98] transition-transform"
                    data-testid={`card-story-${story.id}`}
                  >
                    <div className="relative h-44">
                      {cityImage && (
                        <img
                          src={cityImage}
                          alt={story.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      <div className="absolute top-3 right-3 flex gap-2">
                        {isNew && !isCompleted && (
                          <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded-full flex items-center gap-1" data-testid={`badge-new-${story.id}`}>
                            <Sparkles className="w-3 h-3" /> NEW
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1" data-testid={`badge-completed-${story.id}`}>
                            <CheckCircle className="w-3 h-3" /> Discovered
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                          Episode {story.episodeNumber}
                        </span>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-lg leading-tight" data-testid={`text-story-title-${story.id}`}>
                          {story.title}
                        </h3>
                        <p className="text-white/70 text-xs mt-0.5">{story.subtitle}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-white/60 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDuration(story.durationSeconds)}
                          </span>
                          <span className="text-white/60 text-xs">
                            Season {story.seasonNumber}
                          </span>
                        </div>
                      </div>

                      <div className="absolute bottom-3 right-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                          isCompleted
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-purple-500 to-blue-500"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                          ) : (
                            <Headphones className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {nextEpisode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stories.length * 0.1 + 0.1 }}
                className="mt-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <h2 className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide" data-testid="text-coming-next-label">
                    Coming Next
                  </h2>
                </div>

                <div
                  className="relative overflow-hidden rounded-2xl shadow-md"
                  data-testid="card-next-episode"
                >
                  <div className="relative h-44">
                    {nextEpisode.cityImageUrl && (
                      <img
                        src={nextEpisode.cityImageUrl}
                        alt={nextEpisode.title}
                        className="absolute inset-0 w-full h-full object-cover filter grayscale-[40%] brightness-75"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />

                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 bg-purple-500/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                        Episode {nextEpisode.episodeNumber}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full flex items-center gap-1.5" data-testid="text-release-countdown">
                        <Lock className="w-3 h-3" />
                        {getTimeUntilRelease(nextEpisode.releaseDate)}
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-bold text-lg leading-tight" data-testid="text-next-episode-title">
                        {nextEpisode.title}
                      </h3>
                      <p className="text-white/60 text-xs mt-0.5">{nextEpisode.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-white/50 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatReleaseDay(nextEpisode.releaseDate)}
                        </span>
                        <span className="text-white/50 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(nextEpisode.durationSeconds)}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-white/15 backdrop-blur-sm">
                        <Lock className="w-5 h-5 text-white/70" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
