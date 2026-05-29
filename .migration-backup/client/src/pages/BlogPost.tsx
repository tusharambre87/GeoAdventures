import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Calendar } from "lucide-react";

interface BlogPostData {
  slug: string;
  title: string;
  date: string;
  description: string;
  contentHtml: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const [, setLocation] = useLocation();

  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/blog/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setPost(data); setLoading(false); }
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#F5F2EE" }}>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
          <div className="h-5 w-20 rounded animate-pulse mb-10" style={{ background: "#D8D2C8" }} />
          <div className="h-10 w-3/4 rounded animate-pulse mb-4" style={{ background: "#D8D2C8" }} />
          <div className="h-4 w-32 rounded animate-pulse mb-8" style={{ background: "#D8D2C8" }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 w-full rounded animate-pulse mb-2" style={{ background: "#D8D2C8" }} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#F5F2EE" }}>
        <div className="text-4xl mb-4">🗺️</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#1A1F2E" }}>Post not found</h1>
        <p className="text-sm mb-6" style={{ color: "#6B7080" }}>This post may have moved or doesn't exist.</p>
        <button
          onClick={() => setLocation("/blog")}
          className="text-sm font-bold underline"
          style={{ color: "#E8692A" }}
        >
          ← Back to blog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F2EE" }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-20">

        <button
          onClick={() => setLocation("/blog")}
          className="flex items-center gap-1.5 text-sm font-medium mb-8 transition-opacity hover:opacity-70"
          style={{ color: "#1A1F2E" }}
          data-testid="button-post-back"
        >
          <ArrowLeft className="w-4 h-4" />
          All posts
        </button>

        <article data-testid="article-blog-post">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#E8692A" }}
          >
            GeoAdventures Blog
          </p>

          <h1
            className="text-3xl font-black leading-tight mb-4"
            style={{ color: "#1A1F2E" }}
            data-testid="text-post-title"
          >
            {post.title}
          </h1>

          {post.date && (
            <div
              className="flex items-center gap-1.5 text-sm font-medium mb-8"
              style={{ color: "#9A9FAE" }}
              data-testid="text-post-date"
            >
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.date)}
            </div>
          )}

          {post.description && (
            <p
              className="text-base leading-relaxed mb-8 font-medium"
              style={{
                color: "#4A4F5E",
                borderLeft: "3px solid #E8692A",
                paddingLeft: "16px",
              }}
              data-testid="text-post-description"
            >
              {post.description}
            </p>
          )}

          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            data-testid="block-post-content"
          />
        </article>

        <div
          className="mt-12 pt-6 border-t"
          style={{ borderColor: "#E8E2D9" }}
        >
          <button
            onClick={() => setLocation("/blog")}
            className="flex items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-70"
            style={{ color: "#E8692A" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </button>
        </div>
      </div>

      <style>{`
        .blog-content {
          color: #1A1F2E;
          line-height: 1.75;
          font-size: 1rem;
        }
        .blog-content h1,
        .blog-content h2,
        .blog-content h3,
        .blog-content h4 {
          color: #E8692A;
          font-weight: 900;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .blog-content h1 { font-size: 1.75rem; }
        .blog-content h2 { font-size: 1.375rem; }
        .blog-content h3 { font-size: 1.125rem; }
        .blog-content p {
          margin-bottom: 1.25rem;
          color: #2A2F3E;
        }
        .blog-content ul,
        .blog-content ol {
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .blog-content ul { list-style-type: disc; }
        .blog-content ol { list-style-type: decimal; }
        .blog-content li {
          margin-bottom: 0.5rem;
          color: #2A2F3E;
        }
        .blog-content strong {
          font-weight: 800;
          color: #1A1F2E;
        }
        .blog-content em { font-style: italic; }
        .blog-content a {
          color: #E8692A;
          text-decoration: underline;
        }
        .blog-content hr {
          border: none;
          border-top: 1px solid #E8E2D9;
          margin: 2rem 0;
        }
        .blog-content blockquote {
          border-left: 3px solid #E8692A;
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: #4A4F5E;
          font-style: italic;
        }
        .blog-content code {
          background: #EDE9E3;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .blog-content img {
          width: 100%;
          border-radius: 12px;
          margin: 1.5rem 0;
          display: block;
          object-fit: cover;
          max-height: 420px;
        }
        .blog-content img.hero-image {
          max-height: 480px;
          border-radius: 16px;
          margin-top: 0;
        }
        .blog-content figure {
          margin: 1.5rem 0;
        }
        .blog-content figcaption {
          text-align: center;
          font-size: 0.8rem;
          color: #9A9FAE;
          margin-top: -0.75rem;
          margin-bottom: 0.5rem;
        }
        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.9rem;
        }
        .blog-content th {
          background: #E8692A;
          color: #fff;
          font-weight: 800;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .blog-content td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #E8E2D9;
          color: #2A2F3E;
        }
        .blog-content tr:nth-child(even) td {
          background: #FAF8F5;
        }
      `}</style>
    </div>
  );
}
