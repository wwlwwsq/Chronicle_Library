"use client";

import { useEffect, useState } from "react";
import { api, btnGhost, btnPrimary, inputCls, labelCls } from "./ui";

type Game = {
  id: number;
  title: string;
  slug: string;
  description: string;
  url: string | null;
  builtin: boolean;
  icon: string;
  sortOrder: number;
};

export default function AdminGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", url: "", icon: "🎮", description: "" });

  const load = async () => {
    try {
      setGames(await api<Game[]>("/api/games"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      if (editingId === null) {
        await api("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setMessage("已添加外部游戏。");
      } else {
        await api(`/api/games/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setMessage("已保存修改。");
      }
      setForm({ title: "", url: "", icon: "🎮", description: "" });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Game) => {
    if (!window.confirm(`确定移除「${g.title}」吗？`)) return;
    try {
      await api(`/api/games/${g.id}`, { method: "DELETE" });
      setMessage("已移除。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const move = async (g: Game, dir: -1 | 1) => {
    await api(`/api/games/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder: g.sortOrder + dir }),
    });
    await load();
  };

  const startEdit = (g: Game) => {
    setEditingId(g.id);
    setForm({
      title: g.title,
      url: g.url || "",
      icon: g.icon,
      description: g.description,
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-2xl">游戏管理</h1>
      <p className="mt-1 text-sm text-fog">
        三款内置游戏没法删，但可以调顺序；收藏在别处的小游戏，填个网址就收进游戏角。
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border hairline bg-ink-2/40 p-5">
        <p className="font-serif text-lg">
          {editingId === null ? "添加外部游戏" : "编辑游戏"}
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto]">
          <div>
            <label className={labelCls} htmlFor="g-title">名称 *</label>
            <input id="g-title" className={inputCls} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className={labelCls} htmlFor="g-url">网址 *</label>
            <input id="g-url" className={inputCls} value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…" required />
          </div>
          <div className="sm:w-20">
            <label className={labelCls} htmlFor="g-icon">图标</label>
            <input id="g-icon" className={`${inputCls} text-center`} value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="g-desc">一句话介绍</label>
          <input id="g-desc" className={inputCls} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        {error && <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "保存中…" : editingId === null ? "添加" : "保存修改"}
          </button>
          {editingId !== null && (
            <button type="button" className={btnGhost}
              onClick={() => { setEditingId(null); setForm({ title: "", url: "", icon: "🎮", description: "" }); }}>
              取消
            </button>
          )}
        </div>
      </form>

      <h2 className="mb-3 mt-10 font-serif text-lg">全部游戏（{games.length}）</h2>
      {loading ? (
        <p className="text-sm text-fog">加载中…</p>
      ) : (
        <ul className="divide-y hairline overflow-hidden rounded-lg border hairline">
          {games.map((g) => (
            <li key={g.id} className="flex items-center gap-3 bg-ink-2/40 p-4">
              <span className="text-2xl" aria-hidden>{g.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {g.title}
                  {g.builtin && (
                    <span className="ml-2 rounded-full bg-lamp/10 px-2 py-0.5 text-xs text-lamp-2">内置</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-fog">
                  {g.builtin ? `/${g.slug}` : g.url} · 序号 {g.sortOrder}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => move(g, -1)} className={`${btnGhost} px-2`} aria-label="上移">↑</button>
                <button type="button" onClick={() => move(g, 1)} className={`${btnGhost} px-2`} aria-label="下移">↓</button>
                {!g.builtin && (
                  <>
                    <button type="button" onClick={() => startEdit(g)} className={btnGhost}>编辑</button>
                    <button type="button" onClick={() => remove(g)}
                      className="rounded-md border border-red-400/30 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-400/10">
                      删除
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
