#!/usr/bin/env node
/**
 * 桌面壳 fallback 逻辑测试：不启动 Electron，直接验证 main.cjs 的
 * resolveFile 路由规则对 out/ 产物的解析结果。
 *
 * 用法：node scripts/test-desktop-fallback.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const OUT_DIR = path.join(process.cwd(), "out");

// 从 main.cjs 源码中提取 createStaticServer 的 resolveFile 规则做同构验证：
// 这里直接内联同一套规则（与 desktop/main.cjs 保持一致，改动需同步）
const mime = {};
const STATIC_EXTS = new Set([
  ".js", ".css", ".map", ".woff", ".woff2", ".ttf", ".otf",
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg", ".ico",
]);

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/";
  let p = path.normalize(path.join(OUT_DIR, clean));
  if (!p.startsWith(OUT_DIR)) return null;
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    p = path.join(p, "index.html");
  }
  if (fs.existsSync(p)) return p;
  const flatHtml = path.normalize(path.join(OUT_DIR, `${clean}.html`));
  if (flatHtml.startsWith(OUT_DIR) && fs.existsSync(flatHtml)) return flatHtml;
  if (clean.endsWith(".txt") || clean.includes("_rsc")) return null;
  if (STATIC_EXTS.has(path.extname(clean).toLowerCase())) return null;

  const segs = clean.split("/").filter(Boolean);
  segs.pop();
  while (segs.length > 0) {
    const candidate = path.join(OUT_DIR, ...segs, "app.html");
    if (fs.existsSync(candidate)) return candidate;
    segs.pop();
  }
  const index = path.join(OUT_DIR, "index.html");
  return fs.existsSync(index) ? index : null;
}

const cases = [
  ["/", "index.html", "首页直达"],
  ["/books", "books.html", "列表页"],
  ["/books/", "books.html", "列表页带尾斜杠"],
  ["/admin", "admin.html", "后台入口"],
  ["/admin/posts/new", "admin/posts/new.html", "后台新建页"],
  ["/books/9", "books/app.html", "动态路由 → 段占位页"],
  ["/comics/123", "comics/app.html", "漫画动态路由"],
  ["/games/play/3", "games/play/app.html", "游戏动态路由"],
  ["/blog/hello-world", "blog/app.html", "博客 slug 动态路由"],
  ["/admin/posts/7", "admin/posts/app.html", "后台编辑动态路由"],
  ["/books/9.txt", null, "RSC payload 未命中 → 404（触发硬导航）"],
  ["/_next/static/app.js", null, "静态资源未命中 → 404（不回 HTML）"],
  ["/?_rsc=abc", "index.html", "带查询串的首页正常"],
];

let pass = 0;
let fail = 0;
for (const [input, expectSuffix, label] of cases) {
  const result = resolveFile(input);
  const ok =
    expectSuffix === null
      ? result === null
      : result !== null &&
        path.relative(OUT_DIR, result).split(path.sep).join("/") === expectSuffix;
  if (ok) {
    pass++;
    console.log(`PASS  ${label.padEnd(30)} ${input}`);
  } else {
    fail++;
    console.log(
      `FAIL  ${label.padEnd(30)} ${input} → ${result ? path.relative(OUT_DIR, result) : "null"}（期望 ${expectSuffix ?? "null"}）`
    );
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
