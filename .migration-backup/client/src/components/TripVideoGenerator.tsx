import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Video, Play, Share2, Download, Loader2, X, 
  MessageCircle, Mail, Link2, Check, 
  Smartphone, Monitor, RefreshCw, Lock, Edit2, Maximize, Minimize
} from "lucide-react";
import type { TravelTrip, TravelMoment, TravelStop } from "@shared/schema";

const VIDEO_CACHE_DB = "geoquest-video-cache";
const VIDEO_CACHE_STORE = "videos";

async function openVideoCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VIDEO_CACHE_DB, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_CACHE_STORE)) {
        db.createObjectStore(VIDEO_CACHE_STORE, { keyPath: "tripId" });
      }
    };
  });
}

async function getCachedVideo(tripId: string, orientation: string): Promise<{ blob: Blob; mimeType: string; orientation: string } | null> {
  try {
    const cacheKey = `${tripId}_${orientation}`;
    const db = await openVideoCache();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEO_CACHE_STORE, "readonly");
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const request = store.get(cacheKey);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve({ 
            blob: new Blob([result.data], { type: result.mimeType }), 
            mimeType: result.mimeType,
            orientation: result.orientation 
          });
        } else {
          resolve(null);
        }
      };
    });
  } catch {
    return null;
  }
}

async function cacheVideo(tripId: string, orientation: string, blob: Blob, mimeType: string): Promise<void> {
  try {
    const cacheKey = `${tripId}_${orientation}`;
    const db = await openVideoCache();
    const arrayBuffer = await blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEO_CACHE_STORE, "readwrite");
      const store = tx.objectStore(VIDEO_CACHE_STORE);
      const request = store.put({ tripId: cacheKey, data: arrayBuffer, mimeType, orientation, cachedAt: Date.now() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    console.warn("Failed to cache video");
  }
}

interface TripVideoGeneratorProps {
  trip: TravelTrip;
  moments: TravelMoment[];
  stops?: TravelStop[];
  onClose?: () => void;
  isLoading?: boolean;
}

interface SmartPhoto {
  url: string;
  caption: string;
  stopName: string;
  isFavorite: boolean;
  parentComment?: string;
  stopId: string;
}

const VIDEO_STYLES = [
  { id: "classic", name: "Classic", emoji: "✨", description: "Elegant transitions" },
  { id: "fun", name: "Fun", emoji: "🎉", description: "Playful effects" },
  { id: "romantic", name: "Heartfelt", emoji: "💕", description: "Emotional & warm" },
];

const MAX_PHOTOS = 40;

export function TripVideoGenerator({ trip, moments, stops = [], onClose, isLoading = false }: TripVideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState(VIDEO_STYLES[0].id);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [videoMimeType, setVideoMimeType] = useState("video/webm");
  const [loadedPhotoCount, setLoadedPhotoCount] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showParentalLock, setShowParentalLock] = useState(false);
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathError, setMathError] = useState(false);
  const [mathChallenge, setMathChallenge] = useState({ num1: 0, num2: 0, answer: 0 });
  const [pendingSharePlatform, setPendingSharePlatform] = useState<string | null>(null);
  const [showMessageEditor, setShowMessageEditor] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  
  const [loadingCached, setLoadingCached] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hasCacheCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCacheCheckedRef.current) return;
    hasCacheCheckedRef.current = true;
    
    (async () => {
      try {
        const cached = await getCachedVideo(trip.id, orientation);
        if (cached) {
          if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
          }
          const url = URL.createObjectURL(cached.blob);
          setVideoBlob(cached.blob);
          setVideoUrl(url);
          setVideoMimeType(cached.mimeType);
          setGenerationStep("Video loaded from cache");
        }
      } catch (e) {
        console.warn("Error loading cached video:", e);
      } finally {
        setLoadingCached(false);
      }
    })();
  }, [trip.id, orientation]);

  const stopMap = new Map(stops.map(s => [s.id, s]));
  
  const smartPhotos = useCallback((): SmartPhoto[] => {
    const photosByStop = new Map<string, SmartPhoto[]>();
    const seen = new Set<string>();
    
    for (const m of moments) {
      const urls: string[] = [];
      if (m.photoUrl) urls.push(m.photoUrl);
      
      if (Array.isArray(m.photoUrls)) {
        urls.push(...m.photoUrls.filter((u): u is string => typeof u === 'string'));
      } else if (typeof m.photoUrls === 'string' && m.photoUrls) {
        try {
          const parsed = JSON.parse(m.photoUrls);
          if (Array.isArray(parsed)) {
            urls.push(...parsed.filter((u): u is string => typeof u === 'string'));
          }
        } catch {}
      }
      
      for (const url of urls) {
        if (url && !seen.has(url)) {
          seen.add(url);
          const stopName = stopMap.get(m.stopId || "")?.name || "";
          const photo: SmartPhoto = {
            url,
            caption: m.kidPromptResponse || "",
            stopName,
            isFavorite: m.isFavorite || false,
            parentComment: m.parentPromptResponse || undefined,
            stopId: m.stopId || "",
          };
          
          if (!photosByStop.has(photo.stopId)) {
            photosByStop.set(photo.stopId, []);
          }
          photosByStop.get(photo.stopId)!.push(photo);
        }
      }
    }
    
    const result: SmartPhoto[] = [];
    
    photosByStop.forEach((stopPhotos) => {
      const favoritePhoto = stopPhotos.find((p: SmartPhoto) => p.isFavorite);
      const photoWithCaption = stopPhotos.find((p: SmartPhoto) => p.caption || p.parentComment);
      const bestPhoto = favoritePhoto || photoWithCaption || stopPhotos[0];
      if (bestPhoto) {
        result.push(bestPhoto);
      }
    });
    
    const includedUrls = new Set(result.map(p => p.url));
    
    const allPhotos = Array.from(photosByStop.values()).flat();
    const favorites = allPhotos.filter(p => p.isFavorite && !includedUrls.has(p.url));
    for (const fav of favorites) {
      if (result.length >= MAX_PHOTOS) break;
      result.push(fav);
      includedUrls.add(fav.url);
    }
    
    const withComments = allPhotos.filter(p => (p.caption || p.parentComment) && !includedUrls.has(p.url));
    for (const photo of withComments) {
      if (result.length >= MAX_PHOTOS) break;
      result.push(photo);
      includedUrls.add(photo.url);
    }
    
    const remaining = allPhotos.filter(p => !includedUrls.has(p.url));
    const shuffled = remaining.sort(() => Math.random() - 0.5);
    for (const photo of shuffled) {
      if (result.length >= MAX_PHOTOS) break;
      result.push(photo);
    }
    
    return result;
  }, [moments, stops]);

  const photos = smartPhotos();

  const getSupportedMimeType = (): string | null => {
    // Prioritize MP4 for better sharing compatibility across devices
    const types = [
      "video/mp4;codecs=avc1",
      "video/mp4;codecs=h264",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return null;
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    
    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line = testLine;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  };

  const generateVideo = useCallback(async () => {
    if (photos.length === 0) return;
    
    setIsGenerating(true);
    setProgress(0);
    setGenerationStep("Checking browser support...");
    
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGenerating(false);
      setGenerationStep("Error: Canvas not available");
      return;
    }
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsGenerating(false);
      setGenerationStep("Error: Canvas context not available");
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setIsGenerating(false);
      setGenerationStep("Your browser doesn't support video recording. Try Chrome or Firefox!");
      return;
    }
    
    setGenerationStep("Loading photos...");
    if (orientation === "portrait") {
      canvas.width = 1080;
      canvas.height = 1920;
    } else {
      canvas.width = 1920;
      canvas.height = 1080;
    }
    
    try {
      const loadedImages: { img: HTMLImageElement; photo: SmartPhoto }[] = [];
      for (let i = 0; i < photos.length; i++) {
        setProgress((i / photos.length) * 30);
        setGenerationStep(`Loading photo ${i + 1} of ${photos.length}...`);
        
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("CORS failed"));
            img.src = photos[i].url;
          });
          loadedImages.push({ img, photo: photos[i] });
        } catch {
          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("Load failed"));
              img.src = photos[i].url;
            });
            loadedImages.push({ img, photo: photos[i] });
          } catch {
            console.warn(`Skipping photo ${i + 1}: failed to load`);
          }
        }
      }
      
      if (loadedImages.length === 0) {
        setIsGenerating(false);
        setGenerationStep("No photos could be loaded. Please try again.");
        return;
      }
      
      setLoadedPhotoCount(loadedImages.length);
      setGenerationStep(`Creating video from ${loadedImages.length} photos...`);
      
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12000000,
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          resolve(blob);
        };
      });
      
      mediaRecorder.start();
      
      const secondsPerPhoto = Math.min(6, Math.max(4, 60 / loadedImages.length));
      const framesPerPhoto = secondsPerPhoto * 30;
      const introOutroFrames = framesPerPhoto * 1.5;
      const totalFrames = Math.floor(introOutroFrames * 2 + framesPerPhoto * loadedImages.length);
      
      const drawFrame = async (frameIndex: number) => {
        let photoIndex: number;
        let localFrame: number;
        const transitionFrames = 20;
        
        if (frameIndex < introOutroFrames) {
          photoIndex = -1;
          localFrame = frameIndex;
        } else if (frameIndex >= totalFrames - introOutroFrames) {
          photoIndex = loadedImages.length;
          localFrame = frameIndex - (totalFrames - introOutroFrames);
        } else {
          const photoFrameIndex = frameIndex - introOutroFrames;
          photoIndex = Math.floor(photoFrameIndex / framesPerPhoto);
          localFrame = photoFrameIndex % framesPerPhoto;
        }
        
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (photoIndex < 0) {
          // Intro screen - Apple iPhotos style with emotional warmth
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, "#1a1a2e");
          gradient.addColorStop(0.5, "#16213e");
          gradient.addColorStop(1, "#0f3460");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Soft glow effect
          const glowProgress = Math.sin(frameIndex * 0.05) * 0.3 + 0.7;
          ctx.globalAlpha = glowProgress * 0.2;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width * 0.4);
          glowGradient.addColorStop(0, "#f093fb");
          glowGradient.addColorStop(1, "transparent");
          ctx.fillStyle = glowGradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          
          // Date/Year with elegant styling
          if (trip.travelMonth && trip.travelYear) {
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = `${orientation === "portrait" ? 32 : 24}px system-ui`;
            ctx.textAlign = "center";
            ctx.fillText(`${monthNames[trip.travelMonth - 1]} ${trip.travelYear}`, canvas.width / 2, canvas.height / 2 - 140);
          }
          
          // Main title with fade-in effect
          const titleAlpha = Math.min(1, frameIndex / 30);
          ctx.globalAlpha = titleAlpha;
          ctx.fillStyle = "white";
          ctx.font = `bold ${orientation === "portrait" ? 72 : 56}px system-ui`;
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(240, 147, 251, 0.5)";
          ctx.shadowBlur = 30;
          ctx.fillText(trip.name || "Our Journey", canvas.width / 2, canvas.height / 2);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          
          // Destination with subtle styling
          ctx.font = `${orientation === "portrait" ? 40 : 32}px system-ui`;
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText(trip.destination || "", canvas.width / 2, canvas.height / 2 + 60);
          
          // Inspirational opening quote
          ctx.font = `italic ${orientation === "portrait" ? 28 : 22}px system-ui`;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText('"Every journey begins with a single step"', canvas.width / 2, canvas.height / 2 + 180);
          
        } else if (photoIndex >= loadedImages.length) {
          // Outro screen - emotional closing
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, "#1a1a2e");
          gradient.addColorStop(0.5, "#16213e");
          gradient.addColorStop(1, "#0f3460");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Warm glow
          const glowGradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * 0.4);
          glowGradient.addColorStop(0, "rgba(255, 182, 193, 0.3)");
          glowGradient.addColorStop(1, "transparent");
          ctx.fillStyle = glowGradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Photo count celebration
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = `${orientation === "portrait" ? 28 : 22}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(`${loadedImages.length} Memories Captured`, canvas.width / 2, canvas.height / 2 - 120);
          
          // Emotional closing message
          ctx.fillStyle = "white";
          ctx.font = `bold ${orientation === "portrait" ? 56 : 44}px system-ui`;
          ctx.shadowColor = "rgba(255, 182, 193, 0.5)";
          ctx.shadowBlur = 20;
          ctx.fillText("Until Next Time", canvas.width / 2, canvas.height / 2);
          ctx.shadowBlur = 0;
          
          // Heart animation
          const heartScale = 1 + Math.sin(frameIndex * 0.15) * 0.1;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2 + 80);
          ctx.scale(heartScale, heartScale);
          ctx.font = `${orientation === "portrait" ? 60 : 48}px system-ui`;
          ctx.fillText("❤️", 0, 0);
          ctx.restore();
          
          // Trip name reminder
          ctx.font = `${orientation === "portrait" ? 32 : 26}px system-ui`;
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText(trip.name || trip.destination || "", canvas.width / 2, canvas.height / 2 + 160);
          
          // Branding
          ctx.font = `${orientation === "portrait" ? 24 : 20}px system-ui`;
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText("Made with love on GeoQuest", canvas.width / 2, canvas.height - 60);
          
        } else {
          const { img, photo } = loadedImages[photoIndex];
          let alpha = 1;
          
          if (localFrame < transitionFrames) {
            alpha = localFrame / transitionFrames;
          } else if (localFrame > framesPerPhoto - transitionFrames) {
            alpha = (framesPerPhoto - localFrame) / transitionFrames;
          }
          
          ctx.globalAlpha = alpha;
          
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          
          const zoomProgress = localFrame / framesPerPhoto;
          
          // Style-specific effects
          let zoomScale = 1;
          let rotation = 0;
          
          if (selectedStyle === "fun") {
            // Fun style: bouncy zoom and slight rotation
            zoomScale = 1 + Math.sin(zoomProgress * Math.PI) * 0.15;
            rotation = Math.sin(zoomProgress * Math.PI * 2) * 0.02;
          } else if (selectedStyle === "romantic") {
            // Romantic style: slow dreamy zoom
            zoomScale = 1 + zoomProgress * 0.05;
          } else {
            // Classic style: Ken Burns effect
            zoomScale = 1 + zoomProgress * 0.1;
          }
          
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(rotation);
          ctx.scale(zoomScale, zoomScale);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          ctx.restore();
          
          // Style-specific overlays
          if (selectedStyle === "romantic") {
            // Warm vignette for romantic style
            const vignette = ctx.createRadialGradient(
              canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
              canvas.width / 2, canvas.height / 2, canvas.width * 0.7
            );
            vignette.addColorStop(0, "rgba(255, 182, 193, 0)");
            vignette.addColorStop(1, "rgba(255, 182, 193, 0.15)");
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else if (selectedStyle === "fun") {
            // Subtle colorful border for fun style
            const borderWidth = 8;
            const hue = (photoIndex * 60) % 360;
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.4)`;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(borderWidth/2, borderWidth/2, canvas.width - borderWidth, canvas.height - borderWidth);
          }
          
          ctx.globalAlpha = 1;
          
          if (photo.stopName) {
            ctx.save();
            const topGradient = ctx.createLinearGradient(0, 0, 0, 150);
            topGradient.addColorStop(0, "rgba(0,0,0,0.6)");
            topGradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = topGradient;
            ctx.fillRect(0, 0, canvas.width, 150);
            
            ctx.fillStyle = "white";
            ctx.font = `bold ${orientation === "portrait" ? 42 : 32}px system-ui`;
            ctx.textAlign = "left";
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 10;
            ctx.fillText(`📍 ${photo.stopName}`, 50, 80);
            ctx.restore();
          }
          
          const hasKidComment = !!photo.caption;
          const hasParentComment = !!photo.parentComment;
          
          if (hasKidComment || hasParentComment) {
            const gradientHeight = orientation === "portrait" ? 400 : 280;
            const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
            gradient.addColorStop(0, "rgba(0,0,0,0)");
            gradient.addColorStop(0.3, "rgba(0,0,0,0.5)");
            gradient.addColorStop(1, "rgba(0,0,0,0.8)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);
            
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 8;
            ctx.textAlign = "center";
            
            const maxWidth = canvas.width - 100;
            const lineHeight = orientation === "portrait" ? 46 : 34;
            let currentY = canvas.height - gradientHeight + 80;
            
            if (hasKidComment) {
              ctx.fillStyle = "#fef08a";
              ctx.font = `italic ${orientation === "portrait" ? 36 : 26}px system-ui`;
              const kidLines = wrapText(ctx, `"${photo.caption}"`, maxWidth);
              for (const line of kidLines.slice(0, 3)) {
                ctx.fillText(line, canvas.width / 2, currentY);
                currentY += lineHeight;
              }
              currentY += 10;
            }
            
            if (hasParentComment) {
              ctx.fillStyle = "rgba(255,255,255,0.85)";
              ctx.font = `${orientation === "portrait" ? 28 : 22}px system-ui`;
              const parentLines = wrapText(ctx, photo.parentComment!, maxWidth);
              for (const line of parentLines.slice(0, 2)) {
                ctx.fillText(line, canvas.width / 2, currentY);
                currentY += lineHeight - 6;
              }
            }
            
            ctx.shadowBlur = 0;
          }
          
          if (photo.isFavorite) {
            ctx.font = `${orientation === "portrait" ? 48 : 36}px system-ui`;
            ctx.textAlign = "right";
            ctx.fillText("⭐", canvas.width - 50, 80);
          }
          
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = `${orientation === "portrait" ? 28 : 22}px system-ui`;
          ctx.textAlign = "right";
          ctx.fillText(`${photoIndex + 1}/${loadedImages.length}`, canvas.width - 50, canvas.height - 30);
          
          // GeoQuest branding - clean text in bottom-left
          const brandingText = "Created in GeoQuest";
          const fontSize = orientation === "portrait" ? 32 : 26;
          ctx.font = `bold ${fontSize}px system-ui`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "left";
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 8;
          ctx.fillText(brandingText, 40, canvas.height - 80);
          ctx.shadowBlur = 0;
        }
      };
      
      for (let frame = 0; frame < totalFrames; frame++) {
        await drawFrame(frame);
        setProgress(30 + (frame / totalFrames) * 60);
        await new Promise(r => setTimeout(r, 16));
      }
      
      setGenerationStep("Finishing up...");
      mediaRecorder.stop();
      
      const blob = await recordingPromise;
      const url = URL.createObjectURL(blob);
      
      setVideoBlob(blob);
      setVideoUrl(url);
      setVideoMimeType(mimeType.split(';')[0]);
      setProgress(100);
      setGenerationStep("Video ready!");
      
      cacheVideo(trip.id, orientation, blob, mimeType.split(';')[0]).catch(() => {});
      
    } catch (error) {
      console.error("Video generation error:", error);
      setGenerationStep("Error generating video");
    } finally {
      setIsGenerating(false);
    }
  }, [photos, trip.name, trip.destination, trip.travelMonth, trip.travelYear, orientation, selectedStyle, wrapText]);

  const defaultShareMessage = `We just had an amazing family adventure to ${trip.destination}! So many memories, so much fun. Watch our video recap!`;

  const generateMathChallenge = () => {
    const num1 = Math.floor(Math.random() * 10) + 5;
    const num2 = Math.floor(Math.random() * 10) + 5;
    setMathChallenge({ num1, num2, answer: num1 + num2 });
  };

  const handleShareRequest = (platform: string) => {
    if (platform === "download") {
      handleShare("download");
      return;
    }
    setPendingSharePlatform(platform);
    generateMathChallenge();
    setShowParentalLock(true);
    setMathAnswer("");
    setMathError(false);
  };

  const verifyMathAnswer = () => {
    const userAnswer = parseInt(mathAnswer, 10);
    if (userAnswer === mathChallenge.answer) {
      setShowParentalLock(false);
      setShareMessage(defaultShareMessage);
      setShowMessageEditor(true);
    } else {
      setMathError(true);
    }
  };

  const [shareError, setShareError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleShare = async (platform: string) => {
    if (!videoBlob || !videoUrl) return;
    setShareError(null);
    
    const ext = videoMimeType.includes('mp4') ? 'mp4' : 'webm';
    const filename = `${trip.name.replace(/\s+/g, '-')}-memories.${ext}`;
    const file = new File([videoBlob], filename, {
      type: videoMimeType
    });
    
    const message = shareMessage || defaultShareMessage;
    
    try {
      if (platform === "download") {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS || isSafari) {
          window.open(videoUrl, '_blank');
          setShareError("Video opened in new tab. Long-press the video and select 'Save to Photos' to download.");
          setDownloadStarted(true);
        } else {
          const a = document.createElement("a");
          a.href = videoUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => document.body.removeChild(a), 100);
          setDownloadStarted(true);
          setShareError("Video downloading! Check your Downloads folder.");
        }
        return;
      }
      
      if (platform === "copy") {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setShowMessageEditor(false);
        return;
      }
      
      if (platform === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent(`${trip.name} Memories`)}&body=${encodeURIComponent(message + "\n\n(Download the video first, then attach it to your email)")}`;
        setShowMessageEditor(false);
        return;
      }
      
      if (platform === "sms") {
        window.location.href = `sms:?body=${encodeURIComponent(message)}`;
        setShowMessageEditor(false);
        return;
      }
      
      if (platform === "native" && navigator.share) {
        const canShareFiles = navigator.canShare?.({ files: [file] });
        
        if (canShareFiles) {
          try {
            await navigator.share({
              title: `${trip.name} Memories`,
              text: message,
              files: [file]
            });
            setShowMessageEditor(false);
            return;
          } catch (fileShareError: any) {
            if (fileShareError.name !== 'AbortError') {
              setShareError("Video format not supported for direct sharing on this device. Please download first, then share from your Photos app.");
              handleShare("download");
            }
            return;
          }
        } else {
          await navigator.share({
            title: `${trip.name} Memories`,
            text: message,
          });
          setShareError("Download the video first, then share from your Photos app.");
          handleShare("download");
          setShowMessageEditor(false);
          return;
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Share error:", error);
        setShareError("Unable to share directly. Please download the video first.");
      }
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = async () => {
    try {
      const video = videoRef.current;
      const container = videoContainerRef.current;
      
      // Try video element fullscreen first (works better on iOS)
      if (video) {
        // iOS Safari uses webkitEnterFullscreen on video element
        if ('webkitEnterFullscreen' in video && typeof (video as any).webkitEnterFullscreen === 'function') {
          if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
            (video as any).webkitEnterFullscreen();
            return;
          }
        }
        
        // Try video.requestFullscreen (standard)
        if ('requestFullscreen' in video && typeof video.requestFullscreen === 'function') {
          if (!document.fullscreenElement) {
            await video.requestFullscreen();
            return;
          }
        }
      }
      
      // Fallback to container fullscreen
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (container?.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any)?.webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">Loading your trip photos...</p>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
        <CardContent className="p-6 text-center">
          <Video className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <p className="text-muted-foreground">Add some photos to create a video!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20 border-2 border-purple-200 dark:border-purple-700 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-3xl"
              >
                🎬
              </motion.div>
              <div>
                <h3 className="font-bold text-purple-800 dark:text-purple-300">Family Video</h3>
                <p className="text-xs text-muted-foreground">
                  {loadedPhotoCount ?? photos.length} photos selected • Smart mix
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!videoUrl && !isGenerating && (
            <>
              <div className="mb-4 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  Smart selection: 1 photo per stop, favorites, photos with comments, then random (max {MAX_PHOTOS})
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Style
                </p>
                <div className="flex gap-2">
                  {VIDEO_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`flex-1 p-2 rounded-lg text-xs font-medium transition-all ${
                        selectedStyle === style.id
                          ? "bg-purple-500 text-white"
                          : "bg-white/60 dark:bg-slate-700/60 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                      }`}
                      data-testid={`button-style-${style.id}`}
                    >
                      <span className="text-lg block mb-1">{style.emoji}</span>
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Video Orientation</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`flex-1 p-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      orientation === "portrait"
                        ? "bg-purple-500 text-white"
                        : "bg-white/60 dark:bg-slate-700/60 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    }`}
                    data-testid="button-orientation-portrait"
                  >
                    <Smartphone className="w-4 h-4" />
                    Portrait
                  </button>
                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`flex-1 p-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      orientation === "landscape"
                        ? "bg-purple-500 text-white"
                        : "bg-white/60 dark:bg-slate-700/60 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    }`}
                    data-testid="button-orientation-landscape"
                  >
                    <Monitor className="w-4 h-4" />
                    Landscape
                  </button>
                </div>
              </div>

              <Button
                onClick={generateVideo}
                className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                data-testid="button-generate-video"
              >
                <Video className="w-5 h-5" />
                Generate My Video
              </Button>
            </>
          )}

          {isGenerating && (
            <div className="py-6">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="mb-4"
                >
                  <Loader2 className="w-12 h-12 text-purple-500" />
                </motion.div>
                <p className="font-medium mb-2">{generationStep}</p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-4">
              <div className="text-center py-2 px-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  🎵 Add music from Instagram or TikTok when you share - they have great tracks!
                </p>
              </div>
              <div 
                ref={videoContainerRef}
                className={`relative rounded-xl overflow-hidden bg-black mx-auto ${isFullscreen ? "w-full h-full max-h-none" : orientation === "portrait" ? "aspect-[9/16] max-h-[400px]" : "aspect-video max-h-[300px]"}`}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controls
                  controlsList="nodownload"
                  playsInline
                  data-testid="video-preview"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleShare("download")}
                  className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-500"
                  data-testid="button-download-video"
                >
                  <Download className="w-4 h-4" />
                  Save to Photos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShareRequest("native")}
                  className="gap-2"
                  data-testid="button-share-video"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              
              {shareError && (
                <div className={`p-3 rounded-lg border ${downloadStarted ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"}`}>
                  <p className={`text-xs ${downloadStarted ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"}`}>{shareError}</p>
                </div>
              )}

              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-4 gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                      {"share" in navigator && (
                        <button
                          onClick={() => handleShareRequest("native")}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                          data-testid="button-share-native"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[10px]">Share</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleShareRequest("email")}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        data-testid="button-share-email"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px]">Email</span>
                      </button>
                      <button
                        onClick={() => handleShareRequest("sms")}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        data-testid="button-share-sms"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px]">Message</span>
                      </button>
                      <button
                        onClick={() => handleShareRequest("copy")}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        data-testid="button-share-copy"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-center">
                          {copied ? <Check className="w-5 h-5 text-white" /> : <Link2 className="w-5 h-5 text-white" />}
                        </div>
                        <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Tip: Download the video, then add music when you share to Instagram or Facebook! 🎵
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                variant="outline"
                onClick={() => {
                  if (videoUrl) URL.revokeObjectURL(videoUrl);
                  setVideoUrl(null);
                  setVideoBlob(null);
                }}
                className="w-full gap-2"
                data-testid="button-regenerate-video"
              >
                <RefreshCw className="w-4 h-4" />
                Recreate Video
              </Button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      <Dialog open={showParentalLock} onOpenChange={setShowParentalLock}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Parent Verification
            </DialogTitle>
            <DialogDescription>
              Solve this math problem to share this video
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-foreground">
                {mathChallenge.num1} + {mathChallenge.num2} = ?
              </p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Your answer"
              value={mathAnswer}
              onChange={(e) => {
                setMathAnswer(e.target.value);
                setMathError(false);
              }}
              className={`text-center text-2xl ${mathError ? "border-red-500" : ""}`}
              data-testid="input-math-answer"
            />
            {mathError && (
              <p className="text-sm text-red-500 text-center">That's not quite right. Try again!</p>
            )}
            <Button
              onClick={verifyMathAnswer}
              className="w-full"
              disabled={!mathAnswer}
              data-testid="button-verify-math"
            >
              Verify
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Parents: solve this simple math to continue
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMessageEditor} onOpenChange={setShowMessageEditor}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Share Message
            </DialogTitle>
            <DialogDescription>
              Customize the message that will be shared with your video
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              className="resize-none"
              data-testid="textarea-share-message"
            />
            {shareError && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-800 dark:text-amber-300">{shareError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShareMessage(defaultShareMessage);
                }}
                className="flex-1"
                data-testid="button-reset-message"
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (pendingSharePlatform) handleShare(pendingSharePlatform);
                }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                data-testid="button-confirm-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
