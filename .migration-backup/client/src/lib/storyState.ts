import type { TravelMoment, TravelStop } from "@shared/schema";

export type StoryImageState = "A" | "B" | "C";

export function getMomentPhotos(moments: TravelMoment[]): string[] {
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const m of moments) {
    const push = (url: string) => {
      if (url && !seen.has(url)) { seen.add(url); photos.push(url); }
    };
    if (m.photoUrl) push(m.photoUrl);
    const raw = m.photoUrls;
    let arr: unknown[] = [];
    if (Array.isArray(raw)) {
      arr = raw;
    } else if (typeof raw === "string" && raw) {
      try { arr = JSON.parse(raw); } catch {}
    }
    (arr as string[]).filter(u => typeof u === "string" && u.length > 0).forEach(push);
  }
  return photos;
}

export function getStoryImageState(moments: TravelMoment[], visitedStops: TravelStop[]): StoryImageState {
  if (getMomentPhotos(moments).length >= 1) return "A";
  if (visitedStops.length >= 3) return "B";
  return "C";
}

export function getKidMemoryLines(moments: TravelMoment[], visitedStops: TravelStop[]): string[] {
  const lines: string[] = [];
  const add = (text: string) => {
    const t = text.trim();
    if (t && lines.length < 4 && !lines.includes(t)) {
      lines.push(t.length > 90 ? t.slice(0, 87) + "…" : t);
    }
  };
  moments.forEach(m => { if (m.kidPromptResponse) add(m.kidPromptResponse); });
  moments.forEach(m => { if (m.parentPromptResponse) add(m.parentPromptResponse); });
  if (lines.length < 3) {
    const TYPE_LINE: Record<string, string> = {
      museum: "Discovering something new at the museum",
      zoo: "Seeing animals up close",
      aquarium: "Watching the sea life together",
      playground: "Running wild and free",
      beach: "Playing on the beach",
      park: "Taking a breather outside",
      restaurant: "Fuelling up for the adventure",
      market: "Wandering through the market",
      viewpoint: "Taking it all in from above",
      landmark: "Finding something famous",
      garden: "Walking through the gardens",
    };
    visitedStops.forEach(s => {
      const line = TYPE_LINE[(s.stopType ?? "").toLowerCase()] ?? `Exploring ${s.name}`;
      add(line);
    });
  }
  return lines.slice(0, 4);
}
