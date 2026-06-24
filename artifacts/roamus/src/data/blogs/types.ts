export interface BlogPostImage {
  url: string;
  alt: string;
  caption?: string;
  credit?: string;
  credit_url?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  published: boolean;
  contentHtml: string;
  images?: Record<string, BlogPostImage>;
  faqs?: { question: string; answer: string }[];
}
