import type { BlogPost } from "./types";

const modules = import.meta.glob<{ default: BlogPost }>("./*.ts", { eager: true });

export const allPosts: BlogPost[] = Object.entries(modules)
  .filter(([key]) => !key.endsWith("/index.ts") && !key.endsWith("/types.ts"))
  .map(([, mod]) => mod.default)
  .filter((p): p is BlogPost => !!p && typeof p.slug === "string")
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
