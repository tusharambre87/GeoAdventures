export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  published: boolean;
  contentHtml: string;
  faqs?: { question: string; answer: string }[];
}
