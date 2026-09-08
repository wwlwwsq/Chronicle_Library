"use client";

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `请求失败（${res.status}）`
    );
  }
  return data as T;
}

export const inputCls =
  "w-full rounded-md border hairline bg-ink-2 px-3 py-2 text-sm text-paper placeholder:text-fog/50 focus:border-lamp/50 focus:outline-none";

export const labelCls = "mb-1.5 block text-sm text-fog";

export const btnPrimary =
  "rounded-md bg-lamp px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2 disabled:opacity-60";

export const btnGhost =
  "rounded-md border hairline px-3 py-1.5 text-sm text-fog transition-colors hover:border-lamp/50 hover:text-paper";
