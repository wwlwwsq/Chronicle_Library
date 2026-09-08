import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { db } from "@/lib/db";
import { formatDate, parseTags } from "@/lib/site";
import "highlight.js/styles/github-dark-dimmed.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  return { title: post?.title || "随笔" };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-10 border-b hairline pb-8">
          <Link href="/blog" className="text-sm text-fog transition-colors hover:text-lamp-2">
            ← 回书桌
          </Link>
          <h1 className="mt-4 font-serif text-3xl leading-snug sm:text-4xl">{post.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fog">
            <time className="font-mono text-xs">{formatDate(post.createdAt)}</time>
            {parseTags(post.tags).map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-ink-3 px-2.5 py-0.5 text-xs text-fog transition-colors hover:text-lamp-2"
              >
                {t}
              </Link>
            ))}
          </p>
        </header>

        <div className="prose prose-invert prose-lamp max-w-none">
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
