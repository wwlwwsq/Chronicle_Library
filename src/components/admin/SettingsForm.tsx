"use client";

import { useState } from "react";
import { api, btnPrimary, inputCls, labelCls } from "./ui";

export default function SettingsForm({ username }: { username: string }) {
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    setSaving(true);
    try {
      await api("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setMessage("密码已修改，下次登录请用新密码。");
      setOld("");
      setNew("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-2xl">设置</h1>
      <p className="mt-1 text-sm text-fog">当前管理员：@{username}</p>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-lg border hairline bg-ink-2/40 p-5">
        <p className="font-serif text-lg">修改密码</p>
        <div>
          <label className={labelCls} htmlFor="s-old">原密码</label>
          <input id="s-old" type="password" autoComplete="current-password"
            className={inputCls} value={oldPassword}
            onChange={(e) => setOld(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="s-new">新密码（至少 6 位）</label>
          <input id="s-new" type="password" autoComplete="new-password"
            className={inputCls} value={newPassword}
            onChange={(e) => setNew(e.target.value)} minLength={6} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="s-confirm">再输一遍新密码</label>
          <input id="s-confirm" type="password" autoComplete="new-password"
            className={inputCls} value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required />
        </div>

        {error && <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{message}</p>}

        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "修改中…" : "修改密码"}
        </button>
      </form>
    </div>
  );
}
