import type { ExploreContent } from "@/lib/apiClient";

export function isStaleContent(content: ExploreContent | null | undefined): boolean {
  const text = (content?.stories?.main?.text ?? "").trim();
  return (
    text.startsWith("[") ||
    text.includes("Fun facts await") ||
    text.includes("explore with your kids as you head over")
  );
}
