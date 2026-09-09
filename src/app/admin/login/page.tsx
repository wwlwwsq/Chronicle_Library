"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { apiUrl, setToken, getToken, authFetch } from "@/lib/api-base";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 已登录（token 或 cookie 会话有效）直接进后台
  useEffect(() => {
    if (!getToken()) return;
    authFetch("/api/auth/me").then((r) => {
      if (r.ok) window.location.replace("/admin");
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "登录失败");
      // 登录成功保存 token：桌面模式（跨域）后续请求走 Authorization: Bearer
      if (data.token) setToken(data.token);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/admin") ? next : "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-md border hairline bg-ink-2 px-3.5 py-2.5 text-sm text-paper placeholder:text-fog/60 focus:border-lamp/50 focus:outline-none";

  return (
    <div className="lamp-glow flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span
            aria-hidden
            className="mb-4 inline-block size-3 rounded-full bg-lamp shadow-[0_0_16px_3px_rgba(230,169,68,0.6)]"
          />
          <h1 className="font-serif text-2xl">{site.name} · 后台</h1>
          <p className="mt-2 text-sm text-fog">管理员登录后才能整理书房。</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-lg border hairline bg-ink-2/60 p-6">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm text-fog">
              用户名
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={input}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-fog">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={input}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-lamp px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2 disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>

          <p className="text-center text-xs text-fog/70">
            默认账号 admin / admin123，登录后请到「设置」改密码。
          </p>
        </form>
      </div>
    </div>
  );
}
