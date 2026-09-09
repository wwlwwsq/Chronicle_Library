/**
 * Electron 主进程：把静态导出的 out/ 作为桌面应用加载。
 *
 * - 内置一个 127.0.0.1 静态服务器（带 SPA fallback）：任何未命中的路径
 *   都回退到 index.html，使 /books/5、/blog/xxx 等客户端路由可以直接
 *   打开和刷新（静态文件服务器默认会 404）。
 * - 外部链接（随笔里的外链、游戏"新窗口打开"）交给系统默认浏览器。
 *
 * 用法：
 *   1. 先构建静态站点：node scripts/build-desktop.mjs
 *   2. 启动桌面应用（DESKTOP_API_URL 指定后端，运行时可切换、无需重新构建）：
 *      DESKTOP_API_URL=https://your-domain.com npx electron desktop/main.cjs
 *      本地联调（配合 next dev）：
 *      DESKTOP_API_URL=http://localhost:3000 npx electron desktop/main.cjs
 */
const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// 虚拟机/远程桌面等受限环境 GPU 子进程无法派生（"GPU process isn't usable"）：
// disable-gpu 走软件渲染，in-process-gpu 把 GPU 逻辑并入主进程（不再派生 GPU 子进程），
// no-sandbox 关闭 Chromium 子进程沙箱（受限 Job 下创建受限 token 子进程会失败）。
// 个人本地阅读应用，安全权衡可接受
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("no-sandbox");

const OUT_DIR = path.join(__dirname, "..", "out");
const PORT = 0; // 随机可用端口，避免与用户已开服务冲突

// 运行时后端地址：/api/* 请求由壳转发到该服务器（无需重新构建即可切换后端）
const API_TARGET = (process.env.DESKTOP_API_URL || "").replace(/\/$/, "");

/** 把 /api 请求原样转发给后端（含请求头、Cookie、流式响应体） */
function proxyApi(req, res) {
  const target = new URL(API_TARGET + req.url);
  const mod =
    target.protocol === "https:" ? require("node:https") : require("node:http");
  const headers = { ...req.headers };
  delete headers.host; // 由目标主机决定
  delete headers.origin;
  delete headers.referer;
  const preq = mod.request(
    target,
    { method: req.method, headers },
    (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers);
      pres.pipe(res);
    }
  );
  preq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({ error: `无法连接后端服务器（${API_TARGET}）：${err.message}` })
    );
  });
  req.pipe(preq);
}

function createStaticServer(root) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8",
  };

  const send = (res, status, file) => {
    const ext = path.extname(file).toLowerCase();
    res.writeHead(status, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  };

  const STATIC_EXTS = new Set([
    ".js", ".css", ".map", ".woff", ".woff2", ".ttf", ".otf",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg", ".ico",
  ]);

  const resolveFile = (urlPath) => {
    // 去掉查询串与尾斜杠，规范化到 root 内
    const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/";
    let p = path.normalize(path.join(root, clean));
    if (!p.startsWith(root)) return null; // 防目录穿越
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      p = path.join(p, "index.html");
    }
    if (fs.existsSync(p)) return p;
    // Next 平铺导出：/books → books.html、/admin/posts/new → admin/posts/new.html
    const flatHtml = path.normalize(path.join(root, `${clean}.html`));
    if (flatHtml.startsWith(root) && fs.existsSync(flatHtml)) return flatHtml;

    // RSC payload（*.txt / _rsc）未命中：明确 404，让 Next 客户端路由
    // 回退为整页导航；整页导航会命中下面的段占位回落
    if (clean.endsWith(".txt") || clean.includes("_rsc")) return null;
    // 静态资源未命中同样 404（避免 JS 404 拿到 HTML 造成诡异报错）
    if (STATIC_EXTS.has(path.extname(clean).toLowerCase())) return null;

    // 段占位回落：动态路由（/books/9 等）构建期只生成了占位页
    // （books/app.html），按段逐级向上找最近的占位页返回，
    // 页面 hydrate 后由客户端按真实 URL 渲染
    const segs = clean.split("/").filter(Boolean);
    segs.pop();
    while (segs.length > 0) {
      const candidate = path.join(root, ...segs, "app.html");
      if (fs.existsSync(candidate)) return candidate;
      segs.pop();
    }

    // 最终兜底：首页
    const index = path.join(root, "index.html");
    return fs.existsSync(index) ? index : null;
  };

  return http.createServer((req, res) => {
    const urlPath = (req.url || "/").split("?")[0];
    // API 请求全部转发给后端；未配置 DESKTOP_API_URL 时给出明确错误，
    // 不回落静态页（否则 API 请求拿到 HTML，前端报错难以排查）
    if (urlPath === "/api" || urlPath.startsWith("/api/")) {
      if (!API_TARGET) {
        res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            error:
              "桌面应用未配置后端地址：请用 DESKTOP_API_URL=服务器地址 启动，" +
              "例如 DESKTOP_API_URL=http://localhost:3000 npx electron desktop/main.cjs",
          })
        );
        return;
      }
      proxyApi(req, res);
      return;
    }
    const file = resolveFile(req.url || "/");
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    send(res, 200, file);
  });
}

async function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    backgroundColor: "#0c1521",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 外部链接走系统浏览器，页面内不弹新窗口
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) shell.openExternal(target);
    return { action: "deny" };
  });

  Menu.setApplicationMenu(null);
  await win.loadURL(url);
}

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(OUT_DIR, "index.html"))) {
    await dialog.showErrorBox(
      "缺少静态构建产物",
      "未找到 out/index.html。\n请先运行：node scripts/build-desktop.mjs\n（桌面模式需要 NEXT_PUBLIC_API_BASE 指向你的服务器）"
    );
    app.quit();
    return;
  }

  const server = createStaticServer(OUT_DIR);
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await createWindow(`http://127.0.0.1:${port}/`);
  } catch (err) {
    await dialog.showErrorBox(
      "窗口加载失败",
      `本地静态服务 http://127.0.0.1:${port}/ 加载失败：\n${err?.message || err}`
    );
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(`http://127.0.0.1:${port}/`);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
