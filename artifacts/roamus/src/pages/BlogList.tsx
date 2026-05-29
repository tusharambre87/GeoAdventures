import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, ArrowRight } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogList() {
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/blog")
      .then((r) => r.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#F5F2EE" }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">

        <button
          onClick={() => setLocation("/geoadventures")}
          className="flex items-center gap-1.5 text-sm font-medium mb-8 transition-opacity hover:opacity-70"
          style={{ color: "#1A1F2E" }}
          data-testid="button-blog-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-10">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#E8692A" }}
          >
            GeoAdventures
          </p>
          <h1
            className="text-4xl font-black leading-tight mb-3"
            style={{ color: "#1A1F2E" }}
            data-testid="text-blog-heading"
          >
            Family Travel Blog
          </h1>
          <p className="text-base" style={{ color: "#4A4F5E" }}>
            Tips, guides, and ideas to help your family travel smarter and make memories that last.
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-6 animate-pulse"
                style={{ background: "#EDE9E3" }}
              >
                <div className="h-4 w-24 rounded mb-3" style={{ background: "#D8D2C8" }} />
                <div className="h-6 w-3/4 rounded mb-2" style={{ background: "#D8D2C8" }} />
                <div className="h-4 w-full rounded mb-1" style={{ background: "#D8D2C8" }} />
                <div className="h-4 w-2/3 rounded" style={{ background: "#D8D2C8" }} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl px-6 py-8 text-center"
            style={{ background: "#FFF0EB", border: "1px solid #F5C4B0" }}
          >
            <p className="font-semibold mb-1" style={{ color: "#1A1F2E" }}>Couldn't load posts</p>
            <p className="text-sm" style={{ color: "#6B7080" }}>Please try refreshing the page.</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div
            className="rounded-2xl px-6 py-8 text-center"
            style={{ background: "#EDE9E3" }}
          >
            <p className="font-semibold" style={{ color: "#1A1F2E" }}>No posts yet — check back soon.</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-5">
            {posts.map((post) => (
              <button
                key={post.slug}
                onClick={() => setLocation(`/blog/${post.slug}`)}
                className="w-full text-left rounded-2xl px-6 py-6 transition-all hover:shadow-md active:scale-[0.99]"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E2D9",
                }}
                data-testid={`card-blog-post-${post.slug}`}
              >
                {post.date && (
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold mb-3"
                    style={{ color: "#9A9FAE" }}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.date)}
                  </div>
                )}

                <h2
                  className="text-xl font-black leading-snug mb-2"
                  style={{ color: "#1A1F2E" }}
                  data-testid={`text-blog-title-${post.slug}`}
                >
                  {post.title}
                </h2>

                {post.description && (
                  <p
                    className="text-sm leading-relaxed mb-4 line-clamp-2"
                    style={{ color: "#4A4F5E" }}
                    data-testid={`text-blog-desc-${post.slug}`}
                  >
                    {post.description}
                  </p>
                )}

                <div
                  className="flex items-center gap-1 text-sm font-bold"
                  style={{ color: "#E8692A" }}
                  data-testid={`link-read-more-${post.slug}`}
                >
                  Read more
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
