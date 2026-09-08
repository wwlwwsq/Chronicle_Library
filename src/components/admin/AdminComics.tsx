"use client";

import { useEffect, useRef, useState } from "react";
import { api, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

type Comic = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
  coverPath: string | null;
  _count?: { pages: number };
  createdAt: string;
};

type FormState = { title: string; author: string; category: string; description: string };

const EMPTY: FormState = { title: "", author: "", category: "", description: "" };

export default function AdminComics() {
  const [comics, setComics] = useState<Comic[]>([]);
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
      setComics(await api<Comic[]>("/api/comics"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 挂载拉取列表：fetch→setState 既有模式，RSC 化列为后续重构项
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载取数场景，规则建议的 RSC 改造属后续重构
    load();
  }, []);

  const resetFiles = () => {
    if (fileRef.current) fileRef.current.value = "";
    if (coverRef.current) coverRef.current.value = "";
  };

  const startEdit = (c: Comic) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      author: c.author,
      category: c.category === "未分类" ? "" : c.category,
      description: c.description,
    });
    resetFiles();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    resetFiles();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const file = fileRef.current?.files?.[0];
    if (!editingId && !file) {
      setError("请选择包含漫画图片的 zip 压缩包");
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

      await api(editingId ? `/api/comics/${editingId}` : "/api/comics", {
        method: editingId ? "PUT" : "POST",
        body: fd,
      });
      setMessage(editingId ? "漫画已更新。" : "漫画已上传并解压完成。");
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Comic) => {
    if (!window.confirm(`确定删除《${c.title}》吗？全部页面图片会一并删除。`)) return;
    try {
      await api(`/api/comics/${c.id}`, { method: "DELETE" });
      setMessage("已删除。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-2xl">漫画管理</h1>
      <p className="mt-1 text-sm text-fog">
        把某一话的图片（按文件名排序）打成一个 zip 上传，会自动解压成页；第一张默认作封面。
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border hairline bg-ink-2/40 p-5">
        <p className="font-serif text-lg">{editingId ? "编辑漫画信息" : "上传新漫画"}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="c-title">标题 *</label>
            <input id="c-title" className={inputCls} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-author">作者</label>
            <input id="c-author" className={inputCls} value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-cat">分类</label>
            <input id="c-cat" className={inputCls} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="不填则归入「未分类」" />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-file">
              图片压缩包{editingId ? "（不选则保留原页面）" : " *"}
            </label>
            <input id="c-file" ref={fileRef} type="file" accept=".zip"
              className="w-full text-sm text-fog file:mr-3 file:rounded-md file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-sm file:text-paper" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="c-desc">简介</label>
          <textarea id="c-desc" className={`${inputCls} h-20 resize-y`} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="sm:w-1/2">
          <label className={labelCls} htmlFor="c-cover">封面图（可选）</label>
          <input id="c-cover" ref={coverRef} type="file" accept="image/*"
            className="w-full text-sm text-fog file:mr-3 file:rounded-md file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-sm file:text-paper" />
        </div>

        {error && <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "处理中…" : editingId ? "保存修改" : "上传并解压"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className={btnGhost}>取消编辑</button>
          )}
        </div>
      </form>

      <h2 className="mb-3 mt-10 font-serif text-lg">已收录（{comics.length}）</h2>
      {loading ? (
        <p className="text-sm text-fog">加载中…</p>
      ) : comics.length === 0 ? (
        <p className="text-sm text-fog">画匣空空的，传第一部漫画吧。</p>
      ) : (
        <ul className="divide-y hairline overflow-hidden rounded-lg border hairline">
          {comics.map((c) => (
            <li key={c.id} className="flex items-center gap-4 bg-ink-2/40 p-4">
              {c.coverPath ? (
                <img decoding="async" src={`/api/files/${c.coverPath}`} alt="" className="h-16 w-12 rounded object-cover" />
              ) : (
                <div className="h-16 w-12 rounded bg-ink-3" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.title}</p>
                <p className="mt-0.5 truncate text-xs text-fog">
                  {c._count?.pages ?? 0} 页 · {c.category}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(c)} className={btnGhost}>编辑</button>
                <button type="button" onClick={() => remove(c)}
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
