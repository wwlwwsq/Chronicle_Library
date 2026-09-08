"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

export default function PostEditor() {
  const params = useParams<{ id?: string }>();
  const id = params?.id ? Number(params.id) : null;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(id !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id === null) return;
    api<{ title: string; summary: string; tags: string; content: string; published: boolean }>(
      `/api/posts/${id}`
    )
      .then((p) => {
        setTitle(p.title);
        setSummary(p.summary);
        setTags(p.tags);
        setContent(p.content);
        setPublished(p.published);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async (publish: boolean) => {
    setError("");
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    if (!content.trim()) {
      setError("正文不能为空");
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({ title, summary, tags, content, published: publish });
      if (id === null) {
        const created = await api<{ id: number }>("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        router.push(`/admin/posts/${created.id}`);
      } else {
        await api(`/api/posts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        setPublished(publish);
        setError("");
        alert(publish ? "已发布。" : "已保存为草稿。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mx-auto max-w-3xl text-sm text-fog">加载中…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">{id === null ? "写新随笔" : "编辑随笔"}</h1>
        <Link href="/admin/posts" className={btnGhost}>返回列表</Link>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className={labelCls} htmlFor="p-title">标题 *</label>
          <input id="p-title" className={`${inputCls} font-serif text-lg`} value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="今天想到的一句话" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="p-tags">标签（逗号分隔）</label>
            <input id="p-tags" className={inputCls} value={tags}
              onChange={(e) => setTags(e.target.value)} placeholder="读书, 生活" />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-summary">摘要（列表页展示）</label>
            <input id="p-summary" className={inputCls} value={summary}
              onChange={(e) => setSummary(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelCls} htmlFor="p-content">正文（Markdown）*</label>
            <button type="button" onClick={() => setPreview(!preview)} className={btnGhost}>
              {preview ? "回到编辑" : "预览效果"}
            </button>
          </div>
          {preview ? (
            <div className="prose prose-invert prose-lamp max-w-none rounded-md border hairline bg-ink-2/40 p-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || "*（暂无内容）*"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              id="p-content"
              className={`${inputCls} h-[55vh] resize-y font-mono text-[13px] leading-6`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"# 一级标题\n\n正文支持 **Markdown** 语法。"}
            />
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={saving} onClick={() => save(true)} className={btnPrimary}>
            {saving ? "保存中…" : published ? "保存并保持发布" : "保存并发布"}
          </button>
          <button type="button" disabled={saving} onClick={() => save(false)} className={btnGhost}>
            存为草稿
          </button>
          <span className="text-xs text-fog">
            {published ? "当前状态：已发布" : "当前状态：草稿（前台不可见）"}
          </span>
        </div>
      </div>
    </div>
  );
}
