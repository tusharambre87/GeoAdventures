import { useState } from "react";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { useSubscription } from "@/lib/subscriptionContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, LogIn, Flame, Users, Settings, Stamp, Map, BookOpen, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { STREAK_BADGES, EXPLORER_AVATARS } from "@/lib/gameData";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

const AVATAR_OPTIONS: Record<string, string> = {
  panda: '🐼', lion: '🦁', elephant: '🐘', penguin: '🐧',
  koala: '🐨', fox: '🦊', owl: '🦉', turtle: '🐢',
  butterfly: '🦋', dolphin: '🐬', rocket: '🚀', globe: '🌍',
};

interface UserHeaderProps {
  className?: string;
  onLoginClick?: () => void;
  inline?: boolean;
  hideStreakBadges?: boolean;
}

export function UserHeader({ className, onLoginClick, inline = false, hideStreakBadges = false }: UserHeaderProps) {
  const { user, logout, stats } = useUser();
  const { activeExplorer } = useExplorer();
  const { isPro } = useSubscription() || {};
  const [, setLocation] = useLocation();

  const containerClass = inline 
    ? "flex items-center gap-2" 
    : "absolute top-4 right-4 z-50 flex items-center gap-3";

  const explorerAvatar = activeExplorer?.avatarKey 
    ? EXPLORER_AVATARS.find(a => a.key === activeExplorer.avatarKey) 
    : null;

  if (!user) {
    return (
      <div className={cn(containerClass, className)}>
         {!inline && <ThemeToggle />}
         {onLoginClick && (
            <Button 
              onClick={onLoginClick}
              className="rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 shadow-lg font-bold"
            >
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
         )}
      </div>
    );
  }

  return (
    <div className={cn(containerClass, className)}>
      {!inline && <ThemeToggle />}
      
      {activeExplorer && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/parent-dashboard">
                <div 
                  className={cn(
                    "flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg border-2 border-white/50 cursor-pointer hover:scale-105 transition-transform",
                    inline ? "px-2 py-1" : "px-3 py-2 gap-2"
                  )}
                  data-testid="active-explorer-indicator"
                >
                  <div className={cn(
                    "bg-white rounded-full shadow-inner flex items-center justify-center",
                    inline ? "w-6 h-6" : "p-1"
                  )}>
                    <span className={inline ? "text-base" : "text-2xl"}>{explorerAvatar?.emoji || '👤'}</span>
                  </div>
                  <span className={cn(
                    "font-bold text-white truncate drop-shadow-sm",
                    inline ? "text-xs max-w-[60px]" : "text-sm max-w-[80px]"
                  )}>
                    {activeExplorer.name}
                  </span>
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-bold">Now Playing: {activeExplorer.name}</p>
              <p className="text-xs text-muted-foreground">
                {activeExplorer.profileType === 'kid' ? `Age ${activeExplorer.ageRange}` : 'Adult Explorer'}
              </p>
              <p className="text-xs text-blue-500 mt-1">Click to switch explorers</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <div className={cn(
        "bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-lg border border-white/50 dark:border-gray-600 flex items-center gap-2",
        inline && "px-2 py-1"
      )}>
        {!inline && !hideStreakBadges && (stats.unlockedStreakBadgeIds && stats.unlockedStreakBadgeIds.length > 0) && (
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {STREAK_BADGES
                .filter(b => stats.unlockedStreakBadgeIds?.includes(b.id))
                .slice(-3)
                .map(badge => (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <span className="text-lg cursor-pointer hover:scale-110 transition-transform" title={badge.name}>
                        {badge.icon}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold">{badge.name}</p>
                      <p className="text-xs">{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))
              }
            </div>
          </TooltipProvider>
        )}
        
        {((stats.explorerStreak || stats.dailyQuestStreak || 0) > 0) && (
           <div className={cn(
             "flex items-center text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/30 rounded-full border border-orange-200 dark:border-orange-700",
             inline ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
           )} title={`${stats.explorerStreak || stats.dailyQuestStreak} Explorer Streak${stats.longestExplorerStreak ? ` (Best: ${stats.longestExplorerStreak})` : ''}`}>
              <Flame className={cn("fill-orange-500 animate-pulse", inline ? "w-3 h-3 mr-0.5" : "w-4 h-4 mr-1")} />
              {stats.explorerStreak || stats.dailyQuestStreak}
           </div>
        )}

        {!inline && <span className="font-heading text-blue-900 dark:text-blue-200 hidden sm:inline">Welcome, {user.username}!</span>}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cn(
              "relative rounded-full p-0 hover:bg-transparent focus:ring-0",
              inline ? "h-7 w-7" : "h-10 w-10"
            )}>
              <Avatar className={cn(
                "border-2 border-blue-500",
                inline ? "h-7 w-7" : "h-10 w-10"
              )}>
                <AvatarImage src="" />
                <AvatarFallback className={cn(
                  "bg-blue-100 text-blue-700 font-bold",
                  inline && "text-xs"
                )}>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                {activeExplorer && (
                  <span className="text-2xl">{AVATAR_OPTIONS[activeExplorer.avatarKey || 'globe'] || '🌍'}</span>
                )}
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email || "Explorer"}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => setLocation("/parent-dashboard")} 
              className="cursor-pointer"
              data-testid="menu-profile-page"
            >
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile Page</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setLocation("/whos-playing")} 
              className="cursor-pointer"
              data-testid="menu-switch-explorers"
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Switch Explorers</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setLocation("/parent-dashboard")} 
              className="cursor-pointer"
              data-testid="menu-parent-dashboard"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Parent Dashboard</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => setLocation("/knowledge-hub")} 
              className="cursor-pointer"
              data-testid="menu-explorer-journal"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span>My Explorer Journal</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setLocation("/passport")} 
              className="cursor-pointer"
              data-testid="menu-passport"
            >
              <Stamp className="mr-2 h-4 w-4" />
              <span>My Passport</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => setLocation("/explorer-map")} 
              className="cursor-pointer"
              data-testid="menu-explorer-map"
            >
              <Map className="mr-2 h-4 w-4" />
              <span>My Explorer Map</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => {
                  logout();
                  setLocation("/");
              }} 
              className="text-red-600 cursor-pointer"
              data-testid="menu-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
