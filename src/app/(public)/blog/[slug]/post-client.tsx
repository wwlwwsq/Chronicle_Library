"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { authFetch } from "@/lib/api-base";
import { formatDate, parseTags } from "@/lib/site";
import "highlight.js/styles/github-dark-dimmed.css";

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string;
  tags: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function PostClient() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const invalid = !slug;
  const [post, setPost] = useState<Post | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    authFetch(`/api/posts/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => alive && setPost(d))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (post) document.title = `${post.title}`;
  }, [post]);

  if (invalid || missing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-serif text-2xl">这篇随笔找不到了</p>
        <Link href="/blog" className="text-sm text-lamp-2 hover:underline">
          ← 回书桌
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-fog">正在翻开这页纸…</p>
      </div>
    );
  }

  const tags = parseTags(post.tags);

  return (
    <div className="lamp-glow min-h-[calc(100vh-56px)]">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/blog"
          className="text-sm text-fog transition-colors hover:text-paper"
        >
          ← 回书桌
        </Link>

        <header className="mt-8">
          <time className="font-mono text-xs text-fog">{formatDate(post.createdAt)}</time>
          <h1 className="mt-2 font-serif text-3xl leading-snug sm:text-4xl">{post.title}</h1>
          {tags.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-full bg-ink-3 px-2.5 py-0.5 text-xs text-fog transition-colors hover:text-lamp-2"
                >
                  {t}
                </Link>
              ))}
            </p>
          )}
        </header>

        <div className="prose prose-invert mt-10 max-w-none border-t hairline pt-10 prose-headings:font-serif prose-a:text-lamp-2">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
