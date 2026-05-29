import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Camera, Loader2, Check, Download, Share2, X, ImageIcon, Shuffle
} from "lucide-react";
import type { TravelTrip, TravelMoment, TravelStop } from "@shared/schema";

interface TripCollageGeneratorProps {
  trip: TravelTrip;
  moments: TravelMoment[];
  stops?: TravelStop[];
  onClose: () => void;
  isLoading?: boolean;
}

export function TripCollageGenerator({ trip, moments, stops = [], onClose, isLoading = false }: TripCollageGeneratorProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [collageText, setCollageText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const allPhotos = (() => {
    const seen = new Set<string>();
    const result: string[] = [];
    
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
          result.push(url);
        }
      }
    }
    return result;
  })();

  useEffect(() => {
    if (allPhotos.length > 0 && selectedPhotos.length === 0) {
      const preselected = allPhotos.slice(0, 5);
      setSelectedPhotos(preselected);
    }
  }, [allPhotos.length]);

  const togglePhoto = (photoUrl: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photoUrl)) {
        return prev.filter(p => p !== photoUrl);
      } else if (prev.length < 5) {
        return [...prev, photoUrl];
      }
      return prev;
    });
  };

  const randomizePhotos = () => {
    const shuffled = [...allPhotos].sort(() => Math.random() - 0.5);
    setSelectedPhotos(shuffled.slice(0, Math.min(5, shuffled.length)));
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const generateCollage = async () => {
    if (selectedPhotos.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#FDF2F8');
      gradient.addColorStop(0.5, '#FCE7F3');
      gradient.addColorStop(1, '#FEF3C7');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const images = await Promise.all(
        selectedPhotos.slice(0, 5).map(url => loadImage(url).catch(() => null))
      );
      const validImages = images.filter((img): img is HTMLImageElement => img !== null);

      const padding = 30;
      const photoAreaTop = 130;
      const photoAreaHeight = height - photoAreaTop - 190;

      if (validImages.length === 1) {
        const img = validImages[0];
        const size = Math.min(width - padding * 2, photoAreaHeight);
        const x = (width - size) / 2;
        const y = photoAreaTop + (photoAreaHeight - size) / 2;
        drawRoundedImage(ctx, img, x, y, size, size, 20);
      } else if (validImages.length === 2) {
        const size = (width - padding * 3) / 2;
        const y = photoAreaTop + (photoAreaHeight - size) / 2;
        drawRoundedImage(ctx, validImages[0], padding, y, size, size, 20);
        drawRoundedImage(ctx, validImages[1], padding * 2 + size, y, size, size, 20);
      } else if (validImages.length === 3) {
        const largeSize = (width - padding * 2) * 0.6;
        const smallSize = (photoAreaHeight - padding) / 2;
        drawRoundedImage(ctx, validImages[0], padding, photoAreaTop, largeSize, photoAreaHeight, 20);
        drawRoundedImage(ctx, validImages[1], padding + largeSize + padding, photoAreaTop, width - largeSize - padding * 3, smallSize, 20);
        drawRoundedImage(ctx, validImages[2], padding + largeSize + padding, photoAreaTop + smallSize + padding, width - largeSize - padding * 3, smallSize, 20);
      } else if (validImages.length === 4) {
        const cols = 2;
        const rows = 2;
        const cellWidth = (width - padding * 3) / cols;
        const cellHeight = (photoAreaHeight - padding) / rows;
        for (let i = 0; i < 4; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = padding + col * (cellWidth + padding);
          const y = photoAreaTop + row * (cellHeight + padding);
          drawRoundedImage(ctx, validImages[i], x, y, cellWidth, cellHeight, 20);
        }
      } else if (validImages.length >= 5) {
        const topRowWidth = (width - padding * 4) / 3;
        const topRowHeight = photoAreaHeight * 0.45;
        const bottomRowWidth = (width - padding * 3) / 2;
        const bottomRowHeight = photoAreaHeight * 0.5;

        for (let i = 0; i < 3; i++) {
          drawRoundedImage(ctx, validImages[i], padding + i * (topRowWidth + padding), photoAreaTop, topRowWidth, topRowHeight, 16);
        }
        
        const bottomY = photoAreaTop + topRowHeight + padding;
        drawRoundedImage(ctx, validImages[3], padding, bottomY, bottomRowWidth, bottomRowHeight, 16);
        drawRoundedImage(ctx, validImages[4], padding * 2 + bottomRowWidth, bottomY, bottomRowWidth, bottomRowHeight, 16);
      }

      ctx.fillStyle = '#7C3AED';
      ctx.font = 'bold 48px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trip.name || trip.destination || 'Our Adventure', width / 2, 80);

      if (collageText) {
        ctx.fillStyle = '#1F2937';
        ctx.font = '24px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        
        const maxWidth = width - padding * 4;
        const words = collageText.split(' ');
        let line = '';
        let y = height - 100;
        
        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), width / 2, y);
            line = word + ' ';
            y += 32;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), width / 2, y);
      }

      // GeoQuest branding - positioned below images, above user text
      ctx.fillStyle = '#7C3AED';
      ctx.font = 'bold 32px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Created in GeoQuest', width / 2, photoAreaTop + photoAreaHeight + 50);

      const dataUrl = canvas.toDataURL('image/png');
      setCollageUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate collage:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const drawRoundedImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();

    const imgRatio = img.width / img.height;
    const cellRatio = width / height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    
    if (imgRatio > cellRatio) {
      sw = img.height * cellRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / cellRatio;
      sy = (img.height - sh) / 2;
    }
    
    ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
    ctx.restore();
  };

  const handleDownload = () => {
    if (!collageUrl) return;
    const link = document.createElement('a');
    link.download = `${trip.name || 'trip'}-collage.png`;
    link.href = collageUrl;
    link.click();
  };

  const handleShare = async () => {
    if (!collageUrl) return;
    
    try {
      const response = await fetch(collageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${trip.name || 'trip'}-collage.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: trip.name || 'Trip Collage',
          text: collageText || 'Check out our adventure!'
        });
      } else {
        handleDownload();
      }
    } catch (error) {
      console.error('Share failed:', error);
      handleDownload();
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto text-amber-400 mb-3 animate-spin" />
          <p className="text-muted-foreground">Loading your trip photos...</p>
        </CardContent>
      </Card>
    );
  }

  if (allPhotos.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200">
        <CardContent className="p-6 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-amber-400 mb-3" />
          <p className="text-muted-foreground">No photos yet! Take some moments first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-600" />
            <span className="font-semibold">Photo Collage</span>
            <span className="text-sm text-muted-foreground">
              ({selectedPhotos.length}/5 selected)
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-collage">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!collageUrl ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                Tap photos to select/deselect. Numbers show order.
              </p>
              {allPhotos.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={randomizePhotos}
                  className="text-xs gap-1 h-7 px-2"
                  data-testid="button-randomize-photos"
                >
                  <Shuffle className="w-3 h-3" />
                  Randomize
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {allPhotos.map((photo, index) => (
                <div
                  key={`photo-${index}-${photo.slice(-20)}`}
                  className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedPhotos.includes(photo)
                      ? 'border-amber-500 ring-2 ring-amber-300'
                      : 'border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => togglePhoto(photo)}
                  data-testid={`collage-photo-${index}`}
                  style={{ aspectRatio: '1/1' }}
                >
                  <img 
                    src={photo} 
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {selectedPhotos.includes(photo) && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {selectedPhotos.includes(photo) && (
                    <div className="absolute bottom-1 left-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">
                      {selectedPhotos.indexOf(photo) + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {allPhotos.length < 5 && (
              <p className="text-xs text-amber-600 mb-2">
                Only {allPhotos.length} photo{allPhotos.length === 1 ? '' : 's'} available. Add more moments for a fuller collage!
              </p>
            )}

            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">
                Add a message (optional)
              </label>
              <Input
                placeholder="Our amazing adventure..."
                value={collageText}
                onChange={(e) => setCollageText(e.target.value.slice(0, 128))}
                maxLength={128}
                className="bg-white dark:bg-slate-800"
                data-testid="input-collage-text"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {collageText.length}/128
              </p>
            </div>

            <Button
              onClick={generateCollage}
              disabled={selectedPhotos.length === 0 || isGenerating}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              data-testid="button-create-collage"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Collage...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Create Collage ({selectedPhotos.length} photos)
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg overflow-hidden mb-4">
              <img 
                src={collageUrl} 
                alt="Trip Collage" 
                className="w-full"
                data-testid="img-collage-result"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 gap-2"
                data-testid="button-download-collage"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                onClick={handleShare}
                className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500"
                data-testid="button-share-collage"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                onClick={() => setCollageUrl(null)}
                variant="outline"
                data-testid="button-new-collage"
              >
                New
              </Button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
