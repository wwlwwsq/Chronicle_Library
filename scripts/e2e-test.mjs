// 端到端验证脚本：登录 → 上传图书/漫画 → 发随笔 → 逐页检查（全程 UTF-8）
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const fixtures = path.join(process.cwd(), ".test-fixtures");

function check(name, ok, extra = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name} ${extra}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // 1. 登录（密码可用环境变量 ADMIN_PASSWORD 覆盖，后台改过密码后需要同步）
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  let res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME || "admin", password: adminPassword }),
  });
  const cookie = (res.headers.getSetCookie?.() || [])
    .map((c) => c.split(";")[0])
    .join("; ");
  check("登录", res.ok);
  const auth = { Cookie: cookie };

  // 2. 清掉旧的乱码数据
  for (const api of ["/api/books", "/api/comics", "/api/posts?all=1"]) {
    const list = await (await fetch(`${BASE}${api}`, { headers: auth })).json();
    for (const item of list) {
      await fetch(`${BASE}${api.split("?")[0]}/${item.id}`, {
        method: "DELETE",
        headers: auth,
      });
    }
  }

  // 3. 上传图书（EPUB 优先，没有就 TXT）
  const fd = new FormData();
  fd.set("title", "夜航书");
  fd.set("author", "临水");
  fd.set("category", "小说");
  fd.set("description", "关于一盏灯、一条河与一本读不完的书。");
  const txt = await fs.readFile(path.join(fixtures, "test-book.txt"));
  fd.set("file", new Blob([txt]), "test-book.txt");
  res = await fetch(`${BASE}/api/books`, { method: "POST", headers: auth, body: fd });
  const book = await res.json();
  check("上传 TXT 图书", res.status === 201 && book.id > 0);

  // 4. 上传漫画 zip
  const fd2 = new FormData();
  fd2.set("title", "拾光画报·创刊号");
  fd2.set("category", "画报");
  fd2.set("description", "三页试读。");
  const zipBuf = await fs.readFile(path.join(fixtures, "test-comic.zip"));
  fd2.set("file", new Blob([zipBuf]), "comic.zip");
  res = await fetch(`${BASE}/api/comics`, { method: "POST", headers: auth, body: fd2 });
  const comic = await res.json();
  check("上传漫画 zip（自动解压）", res.status === 201 && comic._count?.pages === 3, `pages=${comic._count?.pages}`);

  // 5. 发随笔
  res = await fetch(`${BASE}/api/posts`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "书房开张的第一篇随笔",
      summary: "灯亮着，欢迎进来坐坐。",
      tags: "生活,开张",
      content:
        "# 书房开张\n\n这间**书房**总算收拾好了。\n\n- 一排书架\n- 一匣漫画\n- 几个小游戏\n\n> 夜深了，灯还亮着。\n\n```js\nconsole.log(\"hello\");\n```\n\n| 栏目 | 状态 |\n| --- | --- |\n| 书架 | 开放 |\n| 画匣 | 开放 |",
      published: true,
    }),
  });
  const post = await res.json();
  check("发布随笔", res.status === 201 && /^[\u4e00-\u9fa5a-z0-9-]+$/i.test(post.slug || ""), `slug=${post.slug}`);

  // 6. 逐页检查
  const pages = [
    ["/", 200],
    ["/books", 200],
    [`/books/${book.id}`, 200],
    ["/comics", 200],
    [`/comics/${comic.id}`, 200],
    ["/blog", 200],
    [`/blog/${encodeURIComponent(post.slug)}`, 200],
    ["/games", 200],
    ["/games/2048", 200],
    ["/games/snake", 200],
    ["/games/memory", 200],
    ["/admin/login", 200],
  ];
  for (const [p, expect] of pages) {
    res = await fetch(`${BASE}${p}`);
    check(`GET ${p}`, res.status === expect, `got=${res.status}`);
  }

  // 7. 文件服务与内容抽查
  res = await fetch(`${BASE}/api/files/${comic.coverPath}`);
  check("漫画封面文件服务", res.status === 200 && res.headers.get("content-type").startsWith("image/"));
  res = await fetch(`${BASE}/api/files/${book.filePath}`);
  const text = await res.text();
  check("图书文件服务", res.status === 200 && text.includes("夜色像一层薄釉"));

  const blogHtml = await (await fetch(`${BASE}/blog/${encodeURIComponent(post.slug)}`)).text();
  check("文章页含正文与代码块", blogHtml.includes("书房开张") && blogHtml.includes("hljs"));

  const homeHtml = await (await fetch(BASE)).text();
  check("首页聚合各栏目", ["夜航书", "拾光画报", "书房开张"].every((t) => homeHtml.includes(t)));

  // 8. 未登录访问受保护 API
  res = await fetch(`${BASE}/api/books`, { method: "POST" });
  check("未登录上传被拒（401/400）", res.status === 401 || res.status === 400);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
