import type { Express } from "express";
import * as fs from "fs";
import * as path from "path";
import { marked } from "marked";

const BLOG_DIR = path.resolve(process.cwd(), "content/blog");

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  contentHtml?: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      meta[key] = value;
    }
  }
  return { meta, body: match[2] };
}

function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf-8");
      const { meta } = parseFrontmatter(raw);
      return {
        slug,
        title: meta.title || slug,
        date: meta.date || "",
        description: meta.description || "",
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function registerBlogRoutes(app: Express) {
  app.get("/api/blog", (_req, res) => {
    try {
      const posts = getAllPosts();
      res.json(posts);
    } catch (err) {
      console.error("[Blog] list error:", err);
      res.status(500).json({ error: "Failed to load blog posts" });
    }
  });

  app.get("/api/blog/:slug", (req, res) => {
    const { slug } = req.params;
    const filePath = path.join(BLOG_DIR, `${slug}.md`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Post not found" });
    }

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { meta, body } = parseFrontmatter(raw);
      const contentHtml = marked(body) as string;

      res.json({
        slug,
        title: meta.title || slug,
        date: meta.date || "",
        description: meta.description || "",
        contentHtml,
      });
    } catch (err) {
      console.error("[Blog] post error:", err);
      res.status(500).json({ error: "Failed to load post" });
    }
  });
}
