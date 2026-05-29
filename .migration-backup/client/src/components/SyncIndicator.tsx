import { useUser } from "@/lib/userContext";
import { Cloud, CloudOff, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function SyncIndicator({ className, showLabel = true }: SyncIndicatorProps) {
  const { isSyncing, isLoadingPlayer, lastSyncTime, syncError, currentPlayerId } = useUser();
  
  if (!currentPlayerId) {
    return (
      <div 
        className={cn("flex items-center gap-1.5 text-xs text-gray-400", className)}
        data-testid="sync-indicator-local"
      >
        <CloudOff className="w-3.5 h-3.5" />
        {showLabel && <span>Local only</span>}
      </div>
    );
  }
  
  if (isSyncing || isLoadingPlayer) {
    return (
      <div 
        className={cn("flex items-center gap-1.5 text-xs text-blue-500", className)}
        data-testid="sync-indicator-syncing"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {showLabel && <span>{isLoadingPlayer ? "Loading..." : "Saving..."}</span>}
      </div>
    );
  }
  
  if (syncError) {
    return (
      <div 
        className={cn("flex items-center gap-1.5 text-xs text-amber-500", className)}
        title={syncError}
        data-testid="sync-indicator-error"
      >
        <CloudOff className="w-3.5 h-3.5" />
        {showLabel && <span>Offline</span>}
      </div>
    );
  }
  
  if (lastSyncTime) {
    return (
      <div 
        className={cn("flex items-center gap-1.5 text-xs text-green-500", className)}
        title={`Last saved: ${lastSyncTime.toLocaleTimeString()}`}
        data-testid="sync-indicator-synced"
      >
        <Cloud className="w-3.5 h-3.5" />
        <Check className="w-3 h-3 -ml-2.5 mt-1" />
        {showLabel && <span>Saved</span>}
      </div>
    );
  }
  
  return (
    <div 
      className={cn("flex items-center gap-1.5 text-xs text-gray-400", className)}
      data-testid="sync-indicator-ready"
    >
      <Cloud className="w-3.5 h-3.5" />
      {showLabel && <span>Cloud sync ready</span>}
    </div>
  );
}

export function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="loading-overlay"
    >
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "md", className }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };
  
  return (
    <Loader2 
      className={cn(sizeClasses[size], "text-blue-500 animate-spin", className)} 
      data-testid="loading-spinner"
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div 
      className={cn("animate-pulse bg-gray-200 rounded-xl", className)}
      data-testid="skeleton-card"
    />
  );
}
