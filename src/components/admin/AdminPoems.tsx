"use client";

import { useEffect, useRef, useState } from "react";
import { api, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

type Poem = {
  id: number;
  title: string;
  author: string;
  dynasty: string;
  style: string;
  content: string;
  note: string;
  posterPath: string | null;
  comicPath: string | null;
  createdAt: string;
};

type FormState = {
  title: string;
  author: string;
  dynasty: string;
  style: string;
  content: string;
  note: string;
};

const DYNASTIES = ["先秦", "汉魏", "南北朝", "隋", "唐", "五代", "宋", "元", "明", "清", "近现代"];
const STYLES = [
  "豪放",
  "婉约",
  "山水田园",
  "边塞征戍",
  "咏史怀古",
  "思乡怀人",
  "送别",
  "哲理",
  "咏物",
  "叙事",
];

const EMPTY: FormState = {
  title: "",
  author: "",
  dynasty: "唐",
  style: "",
  content: "",
  note: "",
};

const fileInputCls =
  "w-full text-sm text-fog file:mr-3 file:rounded-md file:border-0 file:bg-ink-3 file:px-3 file:py-1.5 file:text-sm file:text-paper";

export default function AdminPoems() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Poem | null>(null);
  const [clearPoster, setClearPoster] = useState(false);
  const [clearComic, setClearComic] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const posterRef = useRef<HTMLInputElement>(null);
  const comicRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setPoems(await api<Poem[]>("/api/poems"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 挂载拉取列表：与 AdminBooks 相同的 fetch→setState 模式
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载取数场景
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setEditing(null);
    setForm(EMPTY);
    setClearPoster(false);
    setClearComic(false);
    if (posterRef.current) posterRef.current.value = "";
    if (comicRef.current) comicRef.current.value = "";
  };

  const startEdit = (p: Poem) => {
    setEditingId(p.id);
    setEditing(p);
    setForm({
      title: p.title,
      author: p.author,
      dynasty: p.dynasty,
      style: p.style === "未分类" ? "" : p.style,
      content: p.content,
      note: p.note,
    });
    setClearPoster(false);
    setClearComic(false);
    if (posterRef.current) posterRef.current.value = "";
    if (comicRef.current) comicRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("title", form.title);
      fd.set("author", form.author);
      fd.set("dynasty", form.dynasty);
      fd.set("style", form.style);
      fd.set("content", form.content);
      fd.set("note", form.note);
      const poster = posterRef.current?.files?.[0];
      if (poster) fd.set("poster", poster);
      const comic = comicRef.current?.files?.[0];
      if (comic) fd.set("comic", comic);
      if (editingId) {
        if (clearPoster) fd.set("posterClear", "1");
        if (clearComic) fd.set("comicClear", "1");
      }

      await api(editingId ? `/api/poems/${editingId}` : "/api/poems", {
        method: editingId ? "PUT" : "POST",
        body: fd,
      });
      setMessage(editingId ? "诗词已更新。" : "诗词已录入。");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Poem) => {
    if (!window.confirm(`确定删除《${p.title}》吗？配图会一并删除。`)) return;
    try {
      await api(`/api/poems/${p.id}`, { method: "DELETE" });
      setMessage("已删除。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-2xl">诗词管理</h1>
      <p className="mt-1 text-sm text-fog">
        录入诗文，按年代与风格归类；海报图与漫画图位可留空，之后随时补上。
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border hairline bg-ink-2/40 p-5">
        <p className="font-serif text-lg">{editingId ? "编辑诗词" : "录一首新诗词"}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="p-title">诗题 *</label>
            <input id="p-title" className={inputCls} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-author">作者</label>
            <input id="p-author" className={inputCls} value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-dynasty">年代</label>
            <input id="p-dynasty" list="dynasty-list" className={inputCls} value={form.dynasty}
              onChange={(e) => setForm({ ...form, dynasty: e.target.value })} />
            <datalist id="dynasty-list">
              {DYNASTIES.map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-style">风格</label>
            <input id="p-style" list="style-list" className={inputCls} value={form.style}
              onChange={(e) => setForm({ ...form, style: e.target.value })}
              placeholder="不填则归入「未分类」" />
            <datalist id="style-list">
              {STYLES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="p-content">诗文内容 *（一行一句）</label>
          <textarea id="p-content" className={`${inputCls} h-40 resize-y font-serif leading-8`}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={"床前明月光，\n疑是地上霜。"} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-note">笺注 / 赏析（可选）</label>
          <textarea id="p-note" className={`${inputCls} h-20 resize-y`} value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="p-poster">
              海报图{editingId ? "（不选则保留原图）" : "（可选，预留位）"}
            </label>
            <input id="p-poster" ref={posterRef} type="file" accept="image/*" className={fileInputCls} />
            {editingId && editing?.posterPath && (
              <label className="mt-1.5 flex items-center gap-2 text-xs text-fog">
                <input type="checkbox" checked={clearPoster}
                  onChange={(e) => setClearPoster(e.target.checked)} />
                移除现有海报图
              </label>
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="p-comic">
              漫画图{editingId ? "（不选则保留原图）" : "（可选，预留位）"}
            </label>
            <input id="p-comic" ref={comicRef} type="file" accept="image/*" className={fileInputCls} />
            {editingId && editing?.comicPath && (
              <label className="mt-1.5 flex items-center gap-2 text-xs text-fog">
                <input type="checkbox" checked={clearComic}
                  onChange={(e) => setClearComic(e.target.checked)} />
                移除现有漫画图
              </label>
            )}
          </div>
        </div>

        {error && <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "保存中…" : editingId ? "保存修改" : "录入"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className={btnGhost}>
              取消编辑
            </button>
          )}
        </div>
      </form>

      <h2 className="mb-3 mt-10 font-serif text-lg">已收录（{poems.length}）</h2>
      {loading ? (
        <p className="text-sm text-fog">加载中…</p>
      ) : poems.length === 0 ? (
        <p className="text-sm text-fog">还没有收录诗词，录第一首吧。</p>
      ) : (
        <ul className="divide-y hairline overflow-hidden rounded-lg border hairline">
          {poems.map((p) => (
            <li key={p.id} className="flex items-center gap-4 bg-ink-2/40 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-ink-3 font-serif text-xl text-lamp-2">
                {p.title.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="mt-0.5 truncate text-xs text-fog">
                  {p.dynasty} · {p.style} · {p.author || "佚名"}
                  {p.posterPath && " · 有海报"}
                  {p.comicPath && " · 有漫画"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(p)} className={btnGhost}>编辑</button>
                <button type="button" onClick={() => remove(p)}
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
