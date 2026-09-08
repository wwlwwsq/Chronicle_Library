export const site = {
  name: "拾光书房",
  tagline: "藏书 · 漫画 · 小游戏 · 随笔",
  description:
    "一个人的线上书房：书架、画匣、游戏角和一张书桌，灯一直亮着。",
};

export function parseTags(tags: string): string[] {
  return tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 统一按北京时间显示（容器内是 UTC，直接用本地时区会差一天） */
export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")} 年 ${get("month")} 月 ${get("day")} 日`;
}

export function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function slugify(title: string) {
  // 只保留 ASCII 字母数字，中文标题回退为 post-随机串，
  // 避免非 ASCII slug 在 URL 编码各环节的兼容性问题
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${rand}` : `post-${rand}`;
}
