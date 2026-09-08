"use client";

import { useEffect, useRef, useState } from "react";
import { api, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
  format: string;
  coverPath: string | null;
  fileSize: number;
  createdAt: string;
};

type FormState = {
  title: string;
  author: string;
  category: string;
  description: string;
};

const EMPTY: FormState = { title: "", author: "", category: "", description: "" };

export default function AdminBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setBooks(await api<Book[]>("/api/books"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (b: Book) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      author: b.author,
      category: b.category === "未分类" ? "" : b.category,
      description: b.description,
    });
    if (fileRef.current) fileRef.current.value = "";
    if (coverRef.current) coverRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    if (fileRef.current) fileRef.current.value = "";
    if (coverRef.current) coverRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const file = fileRef.current?.files?.[0];
    if (!editingId && !file) {
      setError("请选择书籍文件（.epub 或 .txt）");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("title", form.title);
      fd.set("author", form.author);
      fd.set("category", form.category);
      fd.set("description", form.description);
      if (file) fd.set("file", file);
      const cover = coverRef.current?.files?.[0];
      if (cover) fd.set("cover", cover);

      await api(editingId ? `/api/books/${editingId}` : "/api/books", {
        method: editingId ? "PUT" : "POST",
        body: fd,
      });
      setMessage(editingId ? "图书已更新。" : "图书已上传。");
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Book) => {
    if (!window.confirm(`确定删除《${b.title}》吗？文件会一并删除。`)) return;
    try {
      await api(`/api/books/${b.id}`, { method: "DELETE" });
      setMessage("已删除。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-2xl">图书管理</h1>
      <p className="mt-1 text-sm text-fog">上传 EPUB / TXT 文件，读者在「书架」里就能在线阅读。</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border hairline bg-ink-2/40 p-5">
        <p className="font-serif text-lg">
          {editingId ? "编辑图书信息" : "上传新书"}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="b-title">书名 *</label>
            <input id="b-title" className={inputCls} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls} htmlFor="b-author">作者</label>
            <input id="b-author" className={inputCls} value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="b-cat">分类</label>
            <input id="b-cat" className={inputCls} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="不填则归入「未分类」" />
          </div>
          <div>
            <label className={labelCls} htmlFor="b-file">
              书籍文件{editingId ? "（不选则保留原文件）" : " *"}
            </label>
            <input id="b-file" ref={fileRef} type="file" accept=".epub,.txt"
              className="w-full text-sm text-fog file:mr-3 file:rounded-md file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-sm file:text-paper" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="b-desc">简介</label>
          <textarea id="b-desc" className={`${inputCls} h-20 resize-y`} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="sm:w-1/2">
          <label className={labelCls} htmlFor="b-cover">封面图（可选，不传则用素书皮）</label>
          <input id="b-cover" ref={coverRef} type="file" accept="image/*"
            className="w-full text-sm text-fog file:mr-3 file:rounded-md file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-sm file:text-paper" />
        </div>

        {error && <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "保存中…" : editingId ? "保存修改" : "上传"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className={btnGhost}>
              取消编辑
            </button>
          )}
        </div>
      </form>

      <h2 className="mb-3 mt-10 font-serif text-lg">已上架（{books.length}）</h2>
      {loading ? (
        <p className="text-sm text-fog">加载中…</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-fog">书架空空的，传第一本书吧。</p>
      ) : (
        <ul className="divide-y hairline overflow-hidden rounded-lg border hairline">
          {books.map((b) => (
            <li key={b.id} className="flex items-center gap-4 bg-ink-2/40 p-4">
              {b.coverPath ? (
                <img src={`/api/files/${b.coverPath}`} alt="" className="h-16 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-16 w-12 items-center justify-center rounded bg-ink-3">
                  <span className="spine-text text-[10px] text-fog line-clamp-2">{b.title.slice(0, 4)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.title}</p>
                <p className="mt-0.5 truncate text-xs text-fog">
                  {b.format.toUpperCase()} · {b.category} · {b.author || "佚名"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(b)} className={btnGhost}>编辑</button>
                <button type="button" onClick={() => remove(b)}
                  className="rounded-md border border-red-400/30 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-400/10">
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
