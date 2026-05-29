import { useState, useRef, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import type { TravelTrip, TravelStop, TravelMoment } from "@shared/schema";
import type { StoryImageState } from "@/lib/storyState";
import { getMomentPhotos, getKidMemoryLines } from "@/lib/storyState";
import { FamilyTravelMap } from "@/components/FamilyTravelMap";
import { X, Camera, Share2 } from "lucide-react";
import { toast } from "sonner";

// ── Photo compression helper ─────────────────────────────────────────────────
// Shrinks a base64/blob photo to ≤maxDim px on its longest side before sending
// to the server vision API. Keeps payloads small so the AI proxy doesn't drop them.
async function compressPhotoForVision(src: string, maxDim = 512): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(src); // fallback: send original
    img.src = src;
  });
}

// ── Card data model ───────────────────────────────────────────────────────────

interface CardState {
  type?: string;
  headline: string;
  sub: string;
  photo: string | null;
  photos: string[];
  lines: string[];
  usingFallback: boolean;
}

// ── Build initial card states ─────────────────────────────────────────────────

// ── Image Intelligence: score photos by emotional richness ────────────────────
function scorePhoto(photoUrl: string, moments: TravelMoment[]): number {
  const moment = moments.find(m => getMomentPhotos([m]).includes(photoUrl));
  if (!moment) return 1;
  let score = 1;
  if (moment.isFavorite) score += 4;
  if ((moment as any).kidPromptResponse) score += 3;
  if ((moment as any).parentPromptResponse) score += 2;
  return score;
}

function rankPhotos(photos: string[], moments: TravelMoment[]): string[] {
  return [...photos].sort((a, b) => scorePhoto(b, moments) - scorePhoto(a, moments));
}

function buildCards(
  trip: TravelTrip,
  visitedStops: TravelStop[],
  moments: TravelMoment[],
  photos: string[],
): CardState[] {
  const dest = trip.destination || trip.name || "your adventure";
  const kidLines = getKidMemoryLines(moments, visitedStops);

  const favPhotos = moments.filter(m => m.isFavorite).flatMap(m => getMomentPhotos([m]));
  const rest = photos.filter(p => !favPhotos.includes(p));
  const raw = Array.from(new Set([...favPhotos, ...rest]));
  // Apply image intelligence: rank all photos by emotional score
  const all = rankPhotos(raw, moments);

  // Collage: best 4 photos spread across the trip (not just first 4)
  const collagePicks = all.length <= 4
    ? all
    : [all[0], all[Math.floor(all.length * 0.3)], all[Math.floor(all.length * 0.65)], all[all.length - 1]];

  // Kid memory card: pick photo from the moment that has a kid quote
  const kidMoment = moments.find(m => (m as any).kidPromptResponse);
  const kidPhoto = kidMoment ? getMomentPhotos([kidMoment])[0] ?? null : (all.at(-1) ?? null);

  return [
    {
      type: "cover",
      headline: visitedStops.length >= 5
        ? "This is what they'll remember"
        : `Exploring ${dest} together`,
      sub: `${visitedStops.length} stop${visitedStops.length !== 1 ? "s" : ""}${moments.length > 0 ? ` · ${moments.length} moment${moments.length !== 1 ? "s" : ""}` : ""}`,
      photo: all[0] ?? null, photos: [], lines: [],
      usingFallback: all.length === 0,
    },
    {
      type: "map",
      headline: `${visitedStops.length} stop${visitedStops.length !== 1 ? "s" : ""} across ${dest}`,
      sub: visitedStops.slice(0, 4).map(s => s.name).join("  ·  "),
      photo: null, photos: [], lines: [], usingFallback: false,
    },
    {
      type: "collage",
      headline: "A few things we won't forget",
      sub: "",
      photo: collagePicks[0] ?? null,
      photos: collagePicks,
      lines: visitedStops.slice(0, 3).map(s => `→ ${s.name}`),
      usingFallback: all.length === 0,
    },
    {
      type: "memory",
      headline: "What they'll remember most",
      sub: "",
      photo: kidPhoto,
      photos: [], lines: kidLines,
      usingFallback: all.length === 0,
    },
    {
      type: "closing",
      headline: `Our ${dest} adventure`,
      sub: "The kind of trip that sticks with you",
      photo: all.at(-1) ?? all[0] ?? null,
      photos: [], lines: [],
      usingFallback: all.length === 0,
    },
  ];
}

// ── Canvas image generation helpers ──────────────────────────────────────────

function canvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed"));
    img.src = src;
  });
}

function wrapTextCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY, maxWidth);
      line = w;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY, maxWidth);
  return curY + lineHeight;
}

async function drawMapTileCard(
  ctx: CanvasRenderingContext2D,
  stops: TravelStop[],
  W: number,
  H: number,
): Promise<boolean> {
  const TILE = 256;
  const geoStops = stops
    .filter(s => s.latitude && s.longitude)
    .map(s => ({ name: s.name, lat: parseFloat(s.latitude!), lon: parseFloat(s.longitude!) }))
    .filter(s => !isNaN(s.lat) && !isNaN(s.lon) && s.lat >= -90 && s.lat <= 90 && s.lon >= -180 && s.lon <= 180);
  if (geoStops.length === 0) return false;

  const lats = geoStops.map(g => g.lat);
  const lons = geoStops.map(g => g.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const span = Math.max(maxLat - minLat, (maxLon - minLon) * Math.cos(centerLat * Math.PI / 180));
  const zoom = span > 15 ? 5 : span > 7 ? 6 : span > 3.5 ? 7 : span > 1.5 ? 8 : span > 0.7 ? 9 : span > 0.3 ? 10 : span > 0.1 ? 11 : 12;
  const n = Math.pow(2, zoom);

  const lonToFracTX = (lon: number) => (lon + 180) / 360 * n;
  const latToFracTY = (lat: number) => {
    const rad = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
  };

  const cTX = lonToFracTX(centerLon);
  const cTY = latToFracTY(centerLat);
  const toCanvas = (lat: number, lon: number): [number, number] => [
    W / 2 + (lonToFracTX(lon) - cTX) * TILE,
    H / 2 + (latToFracTY(lat) - cTY) * TILE,
  ];

  // Draw tiles onto a test canvas first to detect CORS issues
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = W; tileCanvas.height = H;
  const tCtx = tileCanvas.getContext("2d")!;
  const halfW = Math.ceil(W / 2 / TILE) + 1;
  const halfH = Math.ceil(H / 2 / TILE) + 1;
  const loads: Promise<void>[] = [];
  for (let tx = Math.floor(cTX) - halfW; tx <= Math.floor(cTX) + halfW; tx++) {
    for (let ty = Math.floor(cTY) - halfH; ty <= Math.floor(cTY) + halfH; ty++) {
      if (ty < 0 || ty >= n) continue;
      const nx = ((tx % n) + n) % n;
      const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${nx}/${ty}.png`;
      const px = Math.round(W / 2 + (tx - cTX) * TILE);
      const py = Math.round(H / 2 + (ty - cTY) * TILE);
      loads.push(loadImageEl(url).then(img => tCtx.drawImage(img, px, py, TILE, TILE)).catch(() => {}));
    }
  }
  await Promise.all(loads);

  // Verify tile canvas is not CORS-tainted
  try { tileCanvas.toDataURL(); } catch { return false; }

  // Copy tiles to main canvas
  ctx.drawImage(tileCanvas, 0, 0);

  // Dark gradient bands for text readability
  const tGrad = ctx.createLinearGradient(0, 0, 0, 230);
  tGrad.addColorStop(0, "rgba(15,35,75,0.88)"); tGrad.addColorStop(1, "rgba(15,35,75,0)");
  ctx.fillStyle = tGrad; ctx.fillRect(0, 0, W, 230);
  const bGrad = ctx.createLinearGradient(0, H - 310, 0, H);
  bGrad.addColorStop(0, "rgba(15,35,75,0)"); bGrad.addColorStop(1, "rgba(15,35,75,0.92)");
  ctx.fillStyle = bGrad; ctx.fillRect(0, H - 310, W, 310);

  // Dashed orange route
  const pts = geoStops.map(g => toCanvas(g.lat, g.lon));
  if (pts.length > 1) {
    ctx.setLineDash([16, 16]); ctx.strokeStyle = "#E8962F"; ctx.lineWidth = 8;
    ctx.beginPath(); pts.forEach(([x, y], idx) => idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke(); ctx.setLineDash([]);
  }

  // Stop markers
  pts.forEach(([x, y], s) => {
    const isFirst = s === 0, isLast = s === pts.length - 1;
    const rgb = isFirst ? "34,197,94" : isLast ? "232,150,47" : "255,255,255";
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 44);
    glow.addColorStop(0, `rgba(${rgb},0.45)`); glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = isFirst ? "#22c55e" : isLast ? "#E8962F" : "#fff"; ctx.fill();
    ctx.strokeStyle = isFirst ? "#16a34a" : "#E8962F"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 26px Arial, sans-serif";
    const flipSide = s % 2 === 0;
    ctx.textAlign = flipSide ? "right" : "left";
    ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 10;
    ctx.fillText(geoStops[s].name.slice(0, 20), flipSide ? x - 32 : x + 32, y + 9);
    ctx.shadowBlur = 0;
  });
  ctx.textAlign = "center";
  return true;
}

const GRAD_STOPS: [string, string, string][] = [
  ["#1e3a5f", "#2563eb", "#3b82f6"],
  ["#1a2f5f", "#1e40af", "#1d4ed8"],
  ["#1e3a5f", "#0369a1", "#0284c7"],
  ["#312e81", "#4f46e5", "#6366f1"],
  ["#1f2937", "#374151", "#4b5563"],
];

const TOP_LABELS_CANVAS = [
  "FAMILY ADVENTURE",
  "THE JOURNEY",
  "THE MOMENTS THAT MATTERED",
  "THROUGH YOUR EXPLORER'S EYES",
  "ALREADY DREAMING ABOUT THE NEXT ONE",
];

async function generateAllCardImages(
  trip: TravelTrip,
  visitedStops: TravelStop[],
  cards: CardState[],
  caricatureImageUrl?: string | null,
): Promise<File[]> {
  const W = 1080, H = 1350;
  const tripName = trip.name || trip.destination || "adventure";
  const safeBase = tripName.replace(/[^a-z0-9]/gi, "-").toLowerCase().replace(/-+/g, "-").replace(/-$/, "");

  const files: File[] = [];

  for (let i = 0; i < 5; i++) {
    const card = cards[i];
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.textAlign = "center";

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, GRAD_STOPS[i][0]);
    grad.addColorStop(0.6, GRAD_STOPS[i][1]);
    grad.addColorStop(1, GRAD_STOPS[i][2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circle (brand element)
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.42, 300, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();

    // Photo rendering per card type
    if (i === 0 || i === 3 || i === 4) {
      if (card.photo) {
        try {
          const img = await loadImageEl(card.photo);
          const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
          const sw = img.naturalWidth * scale, sh = img.naturalHeight * scale;
          ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
        } catch {}
        const ov = ctx.createLinearGradient(0, 0, 0, H);
        ov.addColorStop(0, "rgba(0,0,0,0.08)");
        ov.addColorStop(0.4, "rgba(0,0,0,0.15)");
        ov.addColorStop(1, "rgba(0,0,0,0.72)");
        ctx.fillStyle = ov;
        ctx.fillRect(0, 0, W, H);
      }
    } else if (i === 2) {
      const PAD = 40, GAP = 16;
      const gridTop = 270, gridH = 710;
      const cellW = (W - PAD * 2 - GAP) / 2;
      const cellH = (gridH - GAP) / 2;
      for (let j = 0; j < Math.min(4, card.photos.length); j++) {
        const col = j % 2, row = Math.floor(j / 2);
        const bx = PAD + col * (cellW + GAP);
        const by = gridTop + row * (cellH + GAP);
        try {
          const img = await loadImageEl(card.photos[j]);
          ctx.save();
          canvasRoundRect(ctx, bx, by, cellW, cellH, 24);
          ctx.clip();
          const scale = Math.max(cellW / img.naturalWidth, cellH / img.naturalHeight);
          const sw = img.naturalWidth * scale, sh = img.naturalHeight * scale;
          ctx.drawImage(img, bx + (cellW - sw) / 2, by + (cellH - sh) / 2, sw, sh);
          ctx.restore();
        } catch {}
      }
    } else if (i === 1) {
      // Map card: try real CartoDB Voyager tiles, fall back to paper-map style
      const usedTiles = await drawMapTileCard(ctx, visitedStops, W, H);
      if (!usedTiles) {
        // Paper-map fallback
        ctx.fillStyle = "#eae6e0"; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(160,150,130,0.25)"; ctx.lineWidth = 1;
        for (let gx = 0; gx <= W; gx += 100) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (let gy = 0; gy <= H; gy += 100) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
        const fbH = ctx.createLinearGradient(0, 0, 0, 240);
        fbH.addColorStop(0, "rgba(20,40,80,1)"); fbH.addColorStop(1, "rgba(20,40,80,0)");
        ctx.fillStyle = fbH; ctx.fillRect(0, 0, W, 240);
        const fbF = ctx.createLinearGradient(0, H - 320, 0, H);
        fbF.addColorStop(0, "rgba(20,40,80,0)"); fbF.addColorStop(1, "rgba(20,40,80,0.95)");
        ctx.fillStyle = fbF; ctx.fillRect(0, H - 320, W, 320);
        const fc = Math.min(visitedStops.length, 6);
        if (fc > 0) {
          const fpts: [number, number][] = Array.from({ length: fc }, (_, s) => {
            const t = fc > 1 ? s / (fc - 1) : 0.5;
            return [W / 2 + Math.sin(t * Math.PI * 1.1) * 170, 310 + t * 680];
          });
          ctx.setLineDash([18, 18]); ctx.strokeStyle = "#E8962F"; ctx.lineWidth = 7;
          ctx.beginPath(); fpts.forEach(([x, y], idx) => idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
          ctx.setLineDash([]);
          fpts.forEach(([x, y], s) => {
            const gl = ctx.createRadialGradient(x, y, 0, x, y, 50);
            gl.addColorStop(0, "rgba(232,150,47,0.35)"); gl.addColorStop(1, "rgba(232,150,47,0)");
            ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2);
            ctx.fillStyle = s === 0 ? "#22c55e" : (s === fc - 1 ? "#E8962F" : "#fff"); ctx.fill();
            ctx.strokeStyle = "#E8962F"; ctx.lineWidth = 5; ctx.stroke();
            ctx.fillStyle = "#1a2035"; ctx.font = "bold 30px Arial, sans-serif";
            ctx.textAlign = s % 2 === 0 ? "right" : "left";
            ctx.fillText(visitedStops[s].name.slice(0, 22), s % 2 === 0 ? x - 42 : x + 42, y + 11);
          });
          ctx.textAlign = "center";
        }
      }
    }

    // Top label
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText(TOP_LABELS_CANVAS[i], W / 2, 80);

    // Card-specific headline text
    if (i === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 84px Arial, sans-serif";
      const ey = wrapTextCanvas(ctx, card.headline, W / 2, H * 0.72, W - 100, 100);
      if (card.sub) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "42px Arial, sans-serif";
        ctx.fillText(card.sub, W / 2, ey + 10);
      }
    } else if (i === 1) {
      // Headline sits in the dark footer band
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 66px Arial, sans-serif";
      const ey = wrapTextCanvas(ctx, card.headline, W / 2, H - 268, W - 120, 82);
      if (card.sub) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "34px Arial, sans-serif";
        ctx.fillText(card.sub, W / 2, Math.min(ey + 8, H - 96), W - 120);
      }
    } else if (i === 2) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 68px Arial, sans-serif";
      wrapTextCanvas(ctx, card.headline, W / 2, 190, W - 100, 82);
    } else if (i === 3) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 70px Arial, sans-serif";
      const ey = wrapTextCanvas(ctx, card.headline, W / 2, H * 0.14, W - 100, 84);
      ctx.textAlign = "left";
      let lineY = Math.max(ey + 40, H * 0.42);
      for (const line of card.lines.slice(0, 4)) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "36px Arial, sans-serif";
        ctx.fillText(`✦  ${line}`, 100, lineY);
        lineY += 80;
      }
      ctx.textAlign = "center";
    } else if (i === 4) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 84px Arial, sans-serif";
      const ey = wrapTextCanvas(ctx, card.headline, W / 2, H * 0.7, W - 100, 100);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "40px Arial, sans-serif";
      ctx.fillText(card.sub, W / 2, ey + 10);
    }

    // Footer branding
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText("GEOADVENTURES", W / 2, H - 55);

    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(), "image/jpeg", 0.92)
    );
    files.push(new File([blob], `${safeBase}-slide${i + 1}.jpg`, { type: "image/jpeg" }));
  }

  // ── Card 6: Our Explorers caricature (if available) ──────────────────────
  if (caricatureImageUrl && caricatureImageUrl !== "failed") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.textAlign = "center";

      // Load the caricature image
      const img = await loadImageEl(caricatureImageUrl);
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const sw = img.naturalWidth * scale, sh = img.naturalHeight * scale;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);

      // Gradient overlay
      const ov = ctx.createLinearGradient(0, 0, 0, H);
      ov.addColorStop(0, "rgba(0,0,0,0.05)");
      ov.addColorStop(0.45, "rgba(0,0,0,0.08)");
      ov.addColorStop(1, "rgba(0,0,0,0.80)");
      ctx.fillStyle = ov;
      ctx.fillRect(0, 0, W, H);

      // Top label
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 26px Arial, sans-serif";
      ctx.fillText("OUR EXPLORERS", W / 2, 80);

      // Bottom text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px Arial, sans-serif";
      ctx.fillText("Our explorers", W / 2, H - 280);
      ctx.fillStyle = "rgba(255,255,255,0.60)";
      ctx.font = "38px Arial, sans-serif";
      ctx.fillText(tripName, W / 2, H - 210);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.font = "bold 26px Arial, sans-serif";
      ctx.fillText("GEOADVENTURES", W / 2, H - 55);

      const blob6 = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(), "image/jpeg", 0.92)
      );
      files.push(new File([blob6], `${safeBase}-slide6.jpg`, { type: "image/jpeg" }));
    } catch {
      // If caricature canvas fails, skip it silently
    }
  }

  return files;
}

// ── Visual constants ──────────────────────────────────────────────────────────

const TOP_LABELS = [
  "Family Adventure",
  "The journey",
  "The moments that mattered",
  "Through your explorer's eyes",
  "Already dreaming about the next one",
];

const GRADIENTS = [
  "linear-gradient(160deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%)",
  "linear-gradient(160deg,#1a2f5f 0%,#1e40af 60%,#1d4ed8 100%)",
  "linear-gradient(160deg,#1e3a5f 0%,#0369a1 60%,#0284c7 100%)",
  "linear-gradient(160deg,#312e81 0%,#4f46e5 60%,#6366f1 100%)",
  "linear-gradient(160deg,#1f2937 0%,#374151 60%,#4b5563 100%)",
];

const FOOTER = "GeoAdventures";

// ── Individual card renders ───────────────────────────────────────────────────

function HeroCard({ card }: { card: CardState }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: GRADIENTS[0] }}>
      {card.photo && (
        <img src={card.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: card.photo ? "linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.2) 45%,rgba(0,0,0,0.05) 100%)" : "none" }}
      />
      <div className="absolute top-5 left-0 right-0 flex justify-center">
        <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{TOP_LABELS[0]}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10">
        <p className="text-2xl font-black text-white leading-tight mb-1.5">{card.headline}</p>
        <p className="text-sm text-white/65 font-semibold mb-5">{card.sub}</p>
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{FOOTER}</p>
      </div>
    </div>
  );
}

function MapCard({ card, stops, trip }: { card: CardState; stops: TravelStop[]; trip: TravelTrip }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: "#1a2f5f" }}>
      <FamilyTravelMap
        trips={[trip]}
        currentTrip={trip}
        stops={stops}
        moments={[]}
        memoryStars={0}
        onClose={() => {}}
        onStopClick={() => {}}
        onTripSelect={() => {}}
        initialView="trip"
        containedMode
        mapMode="share"
      />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-0 right-0 h-20"
          style={{ background: "linear-gradient(to bottom,rgba(26,47,95,0.75) 0%,transparent 100%)" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-28"
          style={{ background: "linear-gradient(to top,rgba(26,47,95,0.9) 0%,transparent 100%)" }}
        />
      </div>
      <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{TOP_LABELS[1]}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pointer-events-none">
        <p className="text-lg font-black text-white leading-tight mb-0.5">{card.headline}</p>
        {card.sub && <p className="text-xs text-white/55 font-medium mb-4 truncate">{card.sub}</p>}
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{FOOTER}</p>
      </div>
    </div>
  );
}

function CollageCard({ card }: { card: CardState }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: GRADIENTS[2] }}>
      <div className="flex-none px-5 pt-8 pb-3">
        <span className="text-[11px] font-bold text-white/55 uppercase tracking-widest block mb-1.5">{TOP_LABELS[2]}</span>
        <p className="text-xl font-black text-white leading-tight">{card.headline}</p>
      </div>
      <div className="flex-1 px-4 min-h-0 pb-2">
        {card.photos.length >= 2 ? (
          <div className="grid grid-cols-2 gap-1.5 h-full max-h-80">
            {card.photos.slice(0, 4).map((photo, pi) => (
              <div key={pi} className="rounded-xl overflow-hidden bg-white/10">
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : card.photos.length === 1 ? (
          <div className="rounded-2xl overflow-hidden" style={{ maxHeight: 280 }}>
            <img src={card.photos[0]} alt="" className="w-full object-cover" />
          </div>
        ) : (
          <div
            className="rounded-2xl h-full max-h-72 flex flex-col justify-center px-5 py-5"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {card.lines.map((line, li) => (
              <div
                key={li}
                className="flex items-center gap-2.5 py-3 border-b border-white/10 last:border-0"
              >
                <span className="text-white/40 text-xs">✦</span>
                <span className="text-white/80 text-sm font-semibold">{line.replace("→ ", "")}</span>
              </div>
            ))}
            {card.lines.length === 0 && (
              <p className="text-white/40 text-sm text-center">Your trip moments will appear here</p>
            )}
          </div>
        )}
      </div>
      <div className="flex-none px-5 pb-10 pt-3">
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{FOOTER}</p>
      </div>
    </div>
  );
}

function MemoryCard({ card }: { card: CardState }) {
  const defaultLines = ["Exploring together", "Discovering something new", "Making memories"];
  const displayLines = card.lines.length > 0 ? card.lines : defaultLines;
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: GRADIENTS[3] }}>
      {card.photo && (
        <img src={card.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0 flex flex-col justify-between px-6 py-10">
        <div>
          <span className="text-[11px] font-bold text-white/55 uppercase tracking-widest block mb-2">{TOP_LABELS[3]}</span>
          <p className="text-2xl font-black text-white leading-tight">{card.headline}</p>
        </div>
        <div className="space-y-4 my-6">
          {displayLines.map((line, li) => (
            <div key={li} className="flex items-start gap-3">
              <span className="text-yellow-400 text-base leading-none mt-0.5 shrink-0">✦</span>
              <span className="text-white text-base font-semibold leading-snug">{line}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{FOOTER}</p>
      </div>
    </div>
  );
}

function ClosingCard({ card }: { card: CardState }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: GRADIENTS[4] }}>
      {card.photo && (
        <img src={card.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.35) 50%,rgba(0,0,0,0.1) 100%)" }}
      />
      <div className="absolute top-5 left-0 right-0 flex justify-center">
        <span className="text-[11px] font-bold text-white/55 uppercase tracking-widest">{TOP_LABELS[4]}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 text-center">
        <p className="text-2xl font-black text-white leading-tight mb-2">{card.headline}</p>
        <p className="text-sm text-white/65 font-semibold mb-5">{card.sub}</p>
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{FOOTER}</p>
      </div>
    </div>
  );
}

// ── Memory intro card (Card 0 — shown when arriving from story-ready) ────────

function MemoryIntroCard({ card }: { card: CardState }) {
  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "#0f172a" }}
    >
      {card.photo && (
        <img
          src={card.photo}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.35 }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.55) 50%,rgba(0,0,0,0.4) 100%)" }}
      />
      <div className="relative z-10 px-8 w-full flex flex-col gap-7">
        <p
          className="text-[11px] font-bold text-white/45 uppercase tracking-widest text-center"
        >
          GeoAdventures
        </p>
        <p className="text-3xl font-black text-white leading-tight text-center">
          {card.headline}
        </p>
        {card.lines.length > 0 && (
          <div className="flex flex-col gap-3">
            {card.lines.slice(0, 3).map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-white/50 text-sm mt-0.5 shrink-0">→</span>
                <p className="text-white/80 text-base leading-snug italic">{line}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
          GeoQuest Games · Family Adventures
        </p>
      </div>
    </div>
  );
}

// ── Caricature card (Our Explorers) ──────────────────────────────────────────

const CARICATURE_STYLES = [
  { id: "pixar", emoji: "🎬", name: "Pixar", desc: "Animated & cartoon" },
  { id: "watercolor", emoji: "🎨", name: "Watercolor", desc: "Storybook painting" },
  { id: "vector", emoji: "⬡", name: "Vector", desc: "Flat modern art" },
  { id: "pastel", emoji: "🖍", name: "Pastel", desc: "Soft travel sketch" },
] as const;

interface CaricatureCardProps {
  caricatureUrl: string | null;
  loading: boolean;
  tripName: string;
  includeCaricature: boolean;
  pickingStyle: boolean;
  selectedStyle: "pixar" | "watercolor" | "vector" | "pastel";
  photos: string[];
  initialSourcePhoto: string | null;
  onToggle: () => void;
  onStyleChange: (s: "pixar" | "watercolor" | "vector" | "pastel") => void;
  onConfirmCreate: (photo: string) => void;
}

function CaricatureCard({ caricatureUrl, loading, tripName, includeCaricature, pickingStyle, selectedStyle, photos, initialSourcePhoto, onToggle, onStyleChange, onConfirmCreate }: CaricatureCardProps) {
  const [localPhoto, setLocalPhoto] = useState<string | null>(initialSourcePhoto);

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) setLocalPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Sync when picker opens with a fresh initialSourcePhoto
  useEffect(() => {
    if (pickingStyle) setLocalPhoto(initialSourcePhoto);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingStyle]);
  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#3b1f5f 0%,#7c3aed 55%,#a855f7 100%)" }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>

      {/* Top label */}
      <div className="absolute top-5 left-0 right-0 flex justify-center">
        <span className="text-[11px] font-bold text-white/55 uppercase tracking-widest">Our Explorers</span>
      </div>

      {/* Main content area */}
      {!includeCaricature ? (
        /* ── OFF state — not included in share ───────────────────────── */
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-32 h-32 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <span className="text-5xl" style={{ opacity: 0.45 }}>🎨</span>
          </div>
          <p className="text-white text-xl font-black leading-tight mb-3">Not included in share</p>
          <p className="text-white/55 text-sm leading-relaxed">
            This card is not included when you share your adventure. Toggle on below to create a new caricature and share it with your story.
          </p>
        </div>
      ) : pickingStyle ? (
        /* ── Style picker — choose before generating ─────────────────── */
        <div className="absolute inset-0 flex flex-col px-6 overflow-y-auto" style={{ paddingTop: 40, paddingBottom: 110 }}>
          <p className="text-white text-lg font-black text-center mb-1">Choose your style</p>
          <p className="text-white/50 text-xs text-center mb-4">Pick how your family gets illustrated</p>

          {/* ── Photo picker ─────────────────────────────────────────── */}
          <div className="mb-4">
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Photo to illustrate</p>
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {/* Upload from phone — label wraps input directly so iOS opens file picker natively */}
              <label
                className="flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "2px dashed rgba(255,255,255,0.35)",
                }}
                data-testid="button-caricature-upload-photo"
              >
                <span className="text-xl leading-none">📷</span>
                <span className="text-white/55 text-[9px] font-semibold leading-none text-center">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadChange}
                  data-testid="input-caricature-upload-hidden"
                />
              </label>
              {/* Trip memory photos */}
              {photos.map((photo, idx) => {
                const isSelected = localPhoto === photo;
                return (
                  <button
                    key={idx}
                    onClick={() => setLocalPhoto(photo)}
                    className="flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden transition-all"
                    style={{
                      outline: isSelected ? "3px solid #a78bfa" : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                    data-testid={`button-caricature-photo-${idx}`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Style grid ───────────────────────────────────────────── */}
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">Illustration style</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {CARICATURE_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => onStyleChange(s.id)}
                className="flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all"
                style={{
                  background: selectedStyle === s.id ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)",
                  border: `2px solid ${selectedStyle === s.id ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.12)"}`,
                }}
                data-testid={`button-pick-style-${s.id}`}
              >
                <span className="text-3xl leading-none">{s.emoji}</span>
                <span className="text-white text-sm font-bold leading-tight">{s.name}</span>
                <span className="text-white/45 text-[10px] leading-tight">{s.desc}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => localPhoto && onConfirmCreate(localPhoto)}
            disabled={!localPhoto}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              border: "2px solid rgba(255,255,255,0.45)",
              boxShadow: "0 0 0 1px rgba(167,139,250,0.4)",
            }}
            data-testid="button-confirm-caricature-create"
          >
            ✨ Create my explorer card
          </button>
        </div>
      ) : loading || !caricatureUrl ? (
        /* ── Loading / placeholder state ─────────────────────────────── */
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-48 h-48 rounded-3xl flex items-center justify-center animate-pulse mb-6"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-6xl">🎨</span>
          </div>
          <p className="text-white text-lg font-black leading-tight">Creating your explorer card…</p>
          <p className="text-white/50 text-sm mt-2 leading-relaxed">Turning your family into characters — this takes about a minute</p>
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "rgba(255,255,255,0.6)", animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── Generated caricature ────────────────────────────────────── */
        <>
          <img
            src={caricatureUrl}
            alt="Our explorers"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.0) 38%,rgba(0,0,0,0.0) 100%)" }}
          />
          <div className="absolute top-8 left-0 right-0 px-6 text-center">
            <p className="text-2xl font-black text-white leading-tight mb-1">Our explorers</p>
            <p className="text-sm text-white/70 font-semibold">{tripName}</p>
          </div>
        </>
      )}

      {/* Toggle pill — always at bottom of card */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-5 py-2.5 rounded-2xl"
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          data-testid="toggle-caricature-on-card"
        >
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-wide">
            {includeCaricature ? "Included in share" : "Not included in share"}
          </span>
          <div
            className="rounded-full flex items-center flex-none transition-colors"
            style={{
              width: 40,
              height: 22,
              padding: 2,
              background: includeCaricature ? "#7c3aed" : "rgba(255,255,255,0.25)",
            }}
          >
            <div
              className="w-4 h-4 bg-white rounded-full transition-all duration-200"
              style={{ transform: includeCaricature ? "translateX(18px)" : "translateX(0)" }}
            />
          </div>
        </button>
        <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">GeoAdventures</p>
      </div>
    </div>
  );
}

// ── Editor panel ──────────────────────────────────────────────────────────────

interface EditorPanelProps {
  currentIndex: number;
  card: CardState;
  momentPhotos: string[];
  onClose: () => void;
  onUpdateField: (idx: number, field: keyof CardState, value: unknown) => void;
  onUpdateMemoryLine: (lineIdx: number, value: string) => void;
  onReplaceImage: (cardIdx: number) => void;
  onSelectMomentPhoto: (cardIdx: number, photo: string) => void;
}

function EditorPanel({
  currentIndex, card, momentPhotos, onClose,
  onUpdateField, onUpdateMemoryLine, onReplaceImage, onSelectMomentPhoto,
}: EditorPanelProps) {
  const cardTypeName: Record<string, string> = {
    "memory-intro": "Memory Intro",
    "cover": "Hero",
    "map": "Map",
    "collage": "Collage",
    "memory": "Kid Memory",
    "closing": "Closing",
  };
  const hasPhoto = card.type !== "map" && card.type !== "memory-intro";
  const cardDisplayName = cardTypeName[card.type ?? ""] ?? "Card";

  return (
    <div
      className="absolute inset-x-0 bottom-0 rounded-t-3xl z-20"
      style={{ background: "#111827", maxHeight: "75vh", overflowY: "auto" }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0" style={{ background: "#111827" }}>
        <p className="text-base font-black text-white">Edit — {cardDisplayName}</p>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      <div className="px-5 pb-10 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1.5">Headline</label>
          <input
            value={card.headline}
            onChange={e => onUpdateField(currentIndex, "headline", e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>

        {card.type !== "map" && card.type !== "memory" && card.type !== "memory-intro" && (
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1.5">
              {card.type === "closing" ? "Closing line" : "Caption"}
            </label>
            <input
              value={card.sub}
              onChange={e => onUpdateField(currentIndex, "sub", e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        )}

        {card.type === "memory" && (
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1.5">Memory lines</label>
            <div className="space-y-2">
              {(card.lines.length > 0 ? card.lines : ["", "", ""]).slice(0, 4).map((line, li) => (
                <input
                  key={li}
                  value={line}
                  placeholder={`Memory ${li + 1}…`}
                  onChange={e => onUpdateMemoryLine(li, e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              ))}
            </div>
          </div>
        )}

        {hasPhoto && momentPhotos.length > 0 && (
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1.5">
              From your trip photos
            </label>
            <div
              className="flex gap-2 pb-1"
              style={{ overflowX: "auto", scrollbarWidth: "none" }}
            >
              {momentPhotos.map((photo, pi) => (
                <button
                  key={pi}
                  onClick={() => onSelectMomentPhoto(currentIndex, photo)}
                  className="flex-none rounded-xl overflow-hidden transition-all"
                  style={{
                    width: 56, height: 56,
                    outline: card.photo === photo ? "2.5px solid #f97316" : "2.5px solid transparent",
                    outlineOffset: 1,
                  }}
                  data-testid={`button-moment-photo-${pi}`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {hasPhoto && (
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-1.5">
              {momentPhotos.length > 0 ? "Or upload a new photo" : card.usingFallback ? "Add a photo" : "Replace image"}
            </label>
            <button
              onClick={() => onReplaceImage(currentIndex)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
              style={{
                background: card.usingFallback && momentPhotos.length === 0
                  ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.07)",
                border: card.usingFallback && momentPhotos.length === 0
                  ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: card.usingFallback && momentPhotos.length === 0 ? "#fb923c" : "white",
              }}
            >
              <Camera className="w-4 h-4" />
              {momentPhotos.length > 0 ? "Choose from camera roll" : card.usingFallback ? "Add from camera roll" : "Choose a different photo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TripStoryPreviewProps {
  trip: TravelTrip;
  stops: TravelStop[];
  moments: TravelMoment[];
  photos: string[];
  imageState: StoryImageState;
  onClose: () => void;
  onAddPhotos: () => void;
}

export function TripStoryPreview({
  trip, stops, moments, photos, imageState, onClose, onAddPhotos,
}: TripStoryPreviewProps) {
  const searchStr = useSearch();
  const fromStoryReady = new URLSearchParams(searchStr).get("from") === "story-ready";
  const visitedStops = useMemo(() => stops.filter(s => s.isVisited), [stops]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [cards, setCards] = useState<CardState[]>(() => {
    const base = buildCards(trip, visitedStops, moments, photos);
    if (!fromStoryReady) return base;
    const memLines = getKidMemoryLines(moments, visitedStops);
    const allPhotos = rankPhotos(getMomentPhotos(moments), moments);
    const card0: CardState = {
      type: "memory-intro",
      headline: "This is what they'll remember",
      sub: "",
      photo: allPhotos[0] ?? null,
      photos: [],
      lines: memLines.slice(0, 3),
      usingFallback: allPhotos.length === 0,
    };
    return [card0, ...base];
  });
  const [editing, setEditing] = useState(false);
  const [showSocialSheet, setShowSocialSheet] = useState(false);
  const [sharingToSocial, setSharingToSocial] = useState(false);

  // ── Our Explorers caricature card ────────────────────────────────────────
  const [caricatureUrl, setCaricatureUrl] = useState<string | null>(null);
  const [caricatureLoading, setCaricatureLoading] = useState(false);
  const [caricatureStyle, setCaricatureStyle] = useState<"pixar" | "watercolor" | "vector" | "pastel">("pixar");
  const [includeCaricature, setIncludeCaricature] = useState(true);
  const [caricaturePickingStyle, setCaricaturePickingStyle] = useState(false);
  const [caricatureSourcePhoto, setCaricatureSourcePhoto] = useState<string | null>(null);
  const caricatureTriggered = useRef(false);

  const touchStartX = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdx = useRef<number | null>(null);

  // Pick the best source photo for caricature: favourite moment first, then any photo
  const bestCaricaturePhoto = useMemo(() => {
    const favPhoto = moments.find(m => m.isFavorite && (m as any).photos?.length > 0);
    if (favPhoto) {
      const p = getMomentPhotos([favPhoto])[0];
      if (p) return p;
    }
    return photos[0] ?? null;
  }, [moments, photos]);

  // Trigger caricature generation in background once on mount (if photos exist)
  useEffect(() => {
    if (caricatureTriggered.current || !bestCaricaturePhoto) return;
    caricatureTriggered.current = true;
    setCaricatureSourcePhoto(bestCaricaturePhoto);
    generateCaricature(bestCaricaturePhoto, "pixar");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateCaricature(imageUrl: string, style: string) {
    setCaricatureLoading(true);
    setCaricatureUrl(null);
    try {
      // Compress to ≤1024px before sending to images.edit — enough detail for
      // faithful style transfer without overwhelming the API payload limit.
      const compressedUrl = await compressPhotoForVision(imageUrl, 1024);

      const res = await fetch(`/api/travel/trips/${trip.id}/generate-caricature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: compressedUrl, style }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setCaricatureUrl(data.caricatureUrl);
      setCaricatureStyle((data.style || "pixar") as typeof caricatureStyle);
    } catch {
      setCaricatureUrl("failed");
    }
    setCaricatureLoading(false);
  }

  // Non-blocking fetch: try to get richer AI-generated day memories for Card 0
  useEffect(() => {
    if (!fromStoryReady || !trip.id) return;
    fetch(`/api/travel/trips/${trip.id}/day-memory`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { lines?: string[] } | null) => {
        if (!data?.lines?.length) return;
        setCards(prev => prev.map(c =>
          c.type === "memory-intro" ? { ...c, lines: data.lines!.slice(0, 3) } : c
        ));
      })
      .catch(() => {}); // non-blocking — keep fallback lines on error
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cards available for sharing/canvas generation (exclude the memory-intro card)
  const shareCards = useMemo(() => cards.filter(c => c.type !== "memory-intro"), [cards]);

  // Card 6 always exists when photos are available; toggle only controls sharing
  const BASE_TOTAL = bestCaricaturePhoto ? 6 : 5;
  const TOTAL = fromStoryReady ? BASE_TOTAL + 1 : BASE_TOTAL;
  const hasCaricatureCard = includeCaricature && !!caricatureUrl && caricatureUrl !== "failed";
  const shareSlideCount = hasCaricatureCard ? 6 : 5;
  const hasRealPhotos = cards.some(c => !c.usingFallback && (c.photo !== null || c.photos.length > 0)) || photos.length > 0;

  const handleCaricatureToggle = () => {
    const next = !includeCaricature;
    setIncludeCaricature(next);
    if (next && bestCaricaturePhoto) {
      // Show style picker first — user confirms before generating
      setCaricatureUrl(null);
      setCaricatureLoading(false);
      caricatureTriggered.current = false;
      setCaricaturePickingStyle(true);
    }
  };

  const handleCaricatureCreate = (photo: string) => {
    setCaricaturePickingStyle(false);
    setCaricatureSourcePhoto(photo);
    generateCaricature(photo, caricatureStyle);
  };

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, TOTAL - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 45) {
      delta > 0 ? goNext() : goPrev();
      setEditing(false);
    }
  };

  const handleShare = async () => {
    const tripName = trip.name || trip.destination || "our adventure";
    const n = visitedStops.length;
    const shareUrl = `${window.location.origin}/s/${trip.id}`;
    const text = `We just finished ${tripName} — ${n} stop${n !== 1 ? "s" : ""} with the kids! ✈️`;
    if (navigator.share) {
      try { await navigator.share({ title: tripName, text, url: shareUrl }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
        toast.success("Link copied — share it!");
      } catch { toast.error("Couldn't copy — try again"); }
    }
  };

  const handleSaveImage = async () => {
    const tripName = trip.name || trip.destination || "our adventure";
    setSharingToSocial(true);
    try {
      const allFiles = await generateAllCardImages(trip, visitedStops, shareCards, hasCaricatureCard && caricatureUrl !== "failed" ? caricatureUrl : null);
      const shareIdx = fromStoryReady ? Math.max(0, currentIndex - 1) : currentIndex;
      const file = allFiles[shareIdx] ?? allFiles[0];
      setSharingToSocial(false);
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: tripName });
        } catch {}
      } else {
        // Fallback for desktop: download
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Image saved!");
      }
    } catch {
      setSharingToSocial(false);
      toast.error("Couldn't save image — try again");
    }
  };

  const handleShareToInstagram = async () => {
    const tripName = trip.name || trip.destination || "our adventure";
    setSharingToSocial(true);
    try {
      const files = await generateAllCardImages(trip, visitedStops, shareCards, hasCaricatureCard && caricatureUrl !== "failed" ? caricatureUrl : null);
      setSharingToSocial(false);
      if (navigator.share && navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, title: tripName, text: "Our family adventure! 🧭" });
        } catch {}
      } else {
        toast.info("Sharing not supported — try the save button");
      }
      setShowSocialSheet(false);
    } catch {
      setSharingToSocial(false);
      toast.error("Couldn't generate images — try again");
    }
  };

  const handleShareToFacebook = async () => {
    const tripName = trip.name || trip.destination || "our adventure";
    setSharingToSocial(true);
    try {
      const files = await generateAllCardImages(trip, visitedStops, shareCards, hasCaricatureCard && caricatureUrl !== "failed" ? caricatureUrl : null);
      setSharingToSocial(false);
      if (navigator.share && navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, title: tripName, text: "Our family adventure! 🧭" });
        } catch {}
      } else {
        toast.info("Sharing not supported — try the save button");
      }
      setShowSocialSheet(false);
    } catch {
      setSharingToSocial(false);
      toast.error("Couldn't generate images — try again");
    }
  };

  const handleDirectInstagramStory = async () => {
    setSharingToSocial(true);
    try {
      const allFiles = await generateAllCardImages(trip, visitedStops, shareCards, hasCaricatureCard && caricatureUrl !== "failed" ? caricatureUrl : null);
      const shareIdx = fromStoryReady ? Math.max(0, currentIndex - 1) : currentIndex;
      const file = allFiles[shareIdx] ?? allFiles[0];
      setSharingToSocial(false);
      try {
        const item = new ClipboardItem({ "image/jpeg": file });
        await navigator.clipboard.write([item]);
        toast.success("Image copied! Opening Instagram Stories — paste it there.");
      } catch {
        toast.info("Opening Instagram Stories — use Save Image first to get the slide.");
      }
      setTimeout(() => { window.location.href = "instagram-stories://share"; }, 400);
      setShowSocialSheet(false);
    } catch {
      setSharingToSocial(false);
      toast.error("Couldn't generate image — try again");
    }
  };

  const handleReplaceImage = (idx: number) => {
    replaceTargetIdx.current = idx;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = replaceTargetIdx.current;
    if (!file || idx === null) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setCards(prev => prev.map((c, i) => {
        if (i !== idx) return c;
        if (c.type === "collage") {
          const updated = [dataUrl, ...c.photos.slice(1)];
          return { ...c, photo: dataUrl, photos: updated, usingFallback: false };
        }
        return { ...c, photo: dataUrl, usingFallback: false };
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    replaceTargetIdx.current = null;
  };

  const updateCardField = (idx: number, field: keyof CardState, value: unknown) => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const updateMemoryLine = (lineIdx: number, value: string) => {
    setCards(prev => prev.map(c => {
      if (c.type !== "memory") return c;
      const lines = [...(c.lines.length > 0 ? c.lines : ["", "", ""])];
      lines[lineIdx] = value;
      return { ...c, lines };
    }));
  };

  const renderCard = (card: CardState | null, i: number) => {
    if (card) {
      switch (card.type) {
        case "memory-intro": return <MemoryIntroCard card={card} />;
        case "cover": return <HeroCard card={card} />;
        case "map": return <MapCard card={card} stops={visitedStops.length > 0 ? visitedStops : stops} trip={trip} />;
        case "collage": return <CollageCard card={card} />;
        case "memory": return <MemoryCard card={card} />;
        case "closing": return <ClosingCard card={card} />;
      }
    }
    if (i === TOTAL - 1 && bestCaricaturePhoto) {
      return (
        <CaricatureCard
          caricatureUrl={caricatureUrl !== "failed" ? caricatureUrl : null}
          loading={caricatureLoading}
          tripName={trip.name || trip.destination || "our adventure"}
          includeCaricature={includeCaricature}
          pickingStyle={caricaturePickingStyle}
          selectedStyle={caricatureStyle}
          photos={photos}
          initialSourcePhoto={caricatureSourcePhoto}
          onToggle={handleCaricatureToggle}
          onStyleChange={setCaricatureStyle}
          onConfirmCreate={handleCaricatureCreate}
        />
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "#0a0a0a" }}
      data-testid="screen-trip-story-preview"
    >
      {/* Top bar */}
      <div
        className="flex-none flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(10,10,10,0.95)" }}
      >
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
          data-testid="button-close-story"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setEditing(false); }}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === currentIndex ? 22 : 6,
                height: 6,
                background: i === currentIndex ? "#f97316" : "rgba(255,255,255,0.28)",
              }}
              data-testid={`button-dot-card-${i}`}
            />
          ))}
        </div>

        <div className="w-8 flex justify-end">
          <span className="text-xs text-white/40 font-bold">{currentIndex + 1}/{TOTAL}</span>
        </div>
      </div>

      {/* Carousel */}
      <div
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className="flex-none w-full h-full">
              {renderCard(cards[i] ?? null, i)}
            </div>
          ))}
        </div>

        {/* Invisible tap zones */}
        {currentIndex > 0 && (
          <button
            onClick={() => { goPrev(); setEditing(false); }}
            className="absolute left-0 top-0 bottom-24 w-1/4"
            style={{ opacity: 0 }}
            aria-label="Previous card"
            data-testid="button-prev-card"
          />
        )}
        {currentIndex < TOTAL - 1 && (
          <button
            onClick={() => { goNext(); setEditing(false); }}
            className="absolute right-0 top-0 bottom-24 w-1/4"
            style={{ opacity: 0 }}
            aria-label="Next card"
            data-testid="button-next-card"
          />
        )}

        {/* Editor overlay */}
        {editing && (
          <>
            <div className="absolute inset-0 bg-black/50 z-10" onClick={() => setEditing(false)} />
            {currentIndex === TOTAL - 1 && bestCaricaturePhoto ? (
              /* ── Caricature card editor ── */
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-3xl z-20"
                style={{ background: "#111827", maxHeight: "75vh", overflowY: "auto" }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0" style={{ background: "#111827" }}>
                  <p className="text-base font-black text-white">Edit — Our Explorers</p>
                  <button
                    onClick={() => setEditing(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                </div>
                <div className="px-5 pb-10 space-y-4">
                  {/* Style picker */}
                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Illustration style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["pixar", "watercolor", "vector", "pastel"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setCaricatureStyle(s)}
                          className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          style={{
                            background: caricatureStyle === s ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.07)",
                            border: `1px solid ${caricatureStyle === s ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)"}`,
                            color: caricatureStyle === s ? "#c4b5fd" : "rgba(255,255,255,0.7)",
                          }}
                          data-testid={`button-caricature-style-${s}`}
                        >
                          {{ pixar: "🎬 Pixar", watercolor: "🎨 Watercolor", vector: "⬡ Vector", pastel: "🖍 Pastel" }[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Regenerate button */}
                  <button
                    onClick={() => {
                      if (!caricatureSourcePhoto) return;
                      generateCaricature(caricatureSourcePhoto, caricatureStyle);
                      setEditing(false);
                    }}
                    disabled={caricatureLoading}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.5)", color: "#c4b5fd" }}
                    data-testid="button-regenerate-caricature"
                  >
                    {caricatureLoading ? "Generating…" : "✨ Try a different style"}
                  </button>
                  {/* Source photo picker */}
                  {photos.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Use a different photo</label>
                      <div className="flex gap-2 pb-1" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
                        {photos.map((photo, pi) => (
                          <button
                            key={pi}
                            onClick={() => {
                              setCaricatureSourcePhoto(photo);
                              generateCaricature(photo, caricatureStyle);
                              setEditing(false);
                            }}
                            className="flex-none rounded-xl overflow-hidden transition-all"
                            style={{
                              width: 56, height: 56,
                              outline: caricatureSourcePhoto === photo ? "2.5px solid #7c3aed" : "2.5px solid transparent",
                              outlineOffset: 1,
                            }}
                            data-testid={`button-caricature-source-${pi}`}
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Remove card */}
                  <button
                    onClick={() => {
                      setIncludeCaricature(false);
                      setCurrentIndex(TOTAL - 2);
                      setEditing(false);
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
                    data-testid="button-remove-caricature"
                  >
                    Remove this card
                  </button>
                </div>
              </div>
            ) : (
              <EditorPanel
                currentIndex={currentIndex}
                card={cards[currentIndex]}
                momentPhotos={photos}
                onClose={() => setEditing(false)}
                onUpdateField={updateCardField}
                onUpdateMemoryLine={updateMemoryLine}
                onReplaceImage={handleReplaceImage}
                onSelectMomentPhoto={(cardIdx, photo) => {
                  setCards(prev => prev.map((c, i) => {
                    if (i !== cardIdx) return c;
                    if (c.type === "collage") {
                      const updated = [photo, ...c.photos.slice(1)];
                      return { ...c, photo, photos: updated, usingFallback: false };
                    }
                    return { ...c, photo, usingFallback: false };
                  }));
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="flex-none px-4 pt-3 pb-8"
        style={{ background: "rgba(10,10,10,0.95)" }}
      >
        {!hasRealPhotos && (
          <button
            onClick={onAddPhotos}
            className="w-full text-center text-sm mb-3 underline"
            style={{ color: "#fb923c" }}
            data-testid="button-add-photos-prompt"
          >
            Add photos to make this story more personal
          </button>
        )}

        {/* Post on Social — full-width prominent button */}
        <button
          onClick={() => setShowSocialSheet(true)}
          className="w-full py-3 rounded-xl text-white text-sm font-bold mb-2 flex items-center justify-center gap-2 transition-opacity active:opacity-80"
          style={{ background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}
          data-testid="button-post-social"
        >
          <Share2 className="w-4 h-4" />
          Post on Social Media
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
            style={{ background: "#D4872B" }}
            data-testid="button-share-story"
          >
            Share link
          </button>
          {cards[currentIndex]?.type !== "memory-intro" && (
            <button
              onClick={() => setEditing(e => !e)}
              className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
              data-testid="button-edit-story"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleSaveImage}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-opacity active:opacity-80"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
            data-testid="button-save-image-story"
          >
            Save image
          </button>
        </div>
      </div>

      {/* Social sharing sheet */}
      {showSocialSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => !sharingToSocial && setShowSocialSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl shadow-2xl pb-10 pt-5 px-5"
            style={{ background: "#1a1a2e" }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-1">Share your trip story</h3>
            <p className="text-white/50 text-xs text-center mb-5">
              {shareSlideCount} slides are generated and shared — choose where to post
            </p>

            {sharingToSocial && (
              <div className="text-center mb-4">
                <p className="text-white/70 text-sm font-semibold">Generating your {shareSlideCount} story slides…</p>
                <p className="text-white/40 text-xs mt-1">This takes a few seconds</p>
              </div>
            )}

            {/* Instagram + Facebook row */}
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleShareToInstagram}
                disabled={sharingToSocial}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-opacity active:opacity-80 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}
                data-testid="button-share-instagram"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-white text-xs font-bold">Instagram</span>
                <span className="text-white/50 text-[10px]">All {shareSlideCount} slides</span>
              </button>

              <button
                onClick={handleShareToFacebook}
                disabled={sharingToSocial}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-opacity active:opacity-80 disabled:opacity-40"
                style={{ background: "#1877f2" }}
                data-testid="button-share-facebook"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-white text-xs font-bold">Facebook</span>
                <span className="text-white/50 text-[10px]">All {shareSlideCount} slides</span>
              </button>
            </div>

            <button
              onClick={() => setShowSocialSheet(false)}
              disabled={sharingToSocial}
              className="w-full py-3 rounded-xl text-white/50 text-sm font-semibold"
              data-testid="button-social-sheet-cancel"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Hidden file input — card photo replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-replace-image"
      />
    </div>
  );
}
