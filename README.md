# 拾光书房 MyBook_DW

一个属于个人的小站：**图书 · 漫画 · 小游戏 · 博客**，四合一样，深夜书房风格。

- **书架**：上传 EPUB / TXT，网页里直接读，带目录、字号调节与阅读进度记忆
- **画匣**：漫画图片打包成 zip 上传，自动解压成页；单页 / 卷轴两种阅读模式，记住看到第几页
- **书桌**：Markdown 写博客，支持标签、草稿、代码高亮
- **游戏角**：内置 2048、贪吃蛇、记忆翻牌（键盘 + 触屏），后台可收藏外部游戏网址站内打开
- **后台**：统一的 `/admin` 管理图书、漫画、随笔、游戏与密码
- **五套主题**：深夜书房（默认）/ 暖纸日光 / 水墨宣纸 / 松间萤火 / 苍绿终端，顶栏一键切换，选择记在浏览器本地，阅读器同步换色

技术栈：Next.js 16（App Router）+ TypeScript + Tailwind CSS v4 + Prisma + SQLite。
整个站是一个单体应用，**一个 Docker 容器即可部署**，数据全部落在 `data/` 目录，备份只需拷走它。

---

## 本地开发

```bash
npm install
npx prisma migrate dev      # 首次：建库（data/app.db）
npm run dev                 # http://localhost:3000
```

首次访问 `http://localhost:3000/admin/login`，默认账号：

> **admin / admin123**（登录后请立即到「设置」修改）

---

## 云服务器部署（Linux + Docker）

### 1. 准备

服务器装好 Docker（含 compose 插件），把项目传上去（git clone 或 scp 均可）。

### 2. 配置环境变量

在项目根目录建一个 `.env`（compose 会读取）：

```ini
# 换成一段足够长的随机字符串（ openssl rand -hex 32 可生成 ）
JWT_SECRET=把这里换成随机长字符串
ADMIN_USERNAME=admin
# 首次启动创建管理员用，登录后改掉
ADMIN_PASSWORD=admin123
```

### 3. 启动

```bash
mkdir -p data
# 容器内以 uid 1001 运行，bind mount 时需要写权限：
chown -R 1001:1001 data

docker compose up -d --build
```

打开 `http://服务器IP:3000` 即可访问，后台在 `/admin`。

### 4. 域名 + HTTPS（可选）

编辑 `deploy/Caddyfile`，把 `example.com` 换成你的域名，然后取消 `docker-compose.yml`
里 caddy 部分的注释，并设置：

```ini
COOKIE_SECURE=true
```

```bash
docker compose up -d
```

Caddy 会自动申请并续期 Let's Encrypt 证书，之后通过 `https://你的域名` 访问。

### 5. 常用命令

```bash
docker compose logs -f mybook     # 看日志
docker compose restart mybook     # 重启
docker compose down               # 停止
docker compose up -d --build      # 更新代码后重新构建
```

### 数据备份

所有数据都在一个目录里（SQLite 库 + 上传的书籍/漫画/封面）：

```bash
tar czf mybook-backup-$(date +%F).tar.gz data/
```

恢复时解压回 `data/` 再重启容器即可。

---

## 桌面应用（Electron / Tauri）

项目支持双模式构建：默认 `next build` 是服务器模式（standalone，行为不变）；
`BUILD_STATIC=1` 时静态导出整个前端到 `out/`，交给桌面壳加载，服务器只跑后端 API。

### 1. 构建静态前端

```bash
# 指向你的服务器 API（桌面模式管理端用 Bearer token，HTTP 也可用）
DESKTOP_API_URL=https://你的域名 npm run build:desktop
```

### 2. 用 Electron 运行

```bash
npm run desktop        # Electron 壳加载 out/，内置 SPA fallback
```

壳的说明（`desktop/main.cjs`）：随机端口起本地静态服务；动态路由
（`/books/9` 等）回落到构建期生成的占位页 `app.html`，hydrate 后按真实
URL 客户端渲染；外部链接交给系统浏览器。

### 3. 打安装包（可选，Tauri 2）

`src-tauri/` 已备好配置（包体 5–10MB，需 Rust 工具链）：

```bash
npx @tauri-apps/cli icon path/to/icon-1024.png   # 先生成图标
npx @tauri-apps/cli build                         # 产出 NSIS 安装包
```

### 桌面模式与网页模式的差异

- 登录：桌面模式把 JWT 存 localStorage 并以 `Authorization: Bearer` 携带
  （服务器两种凭据都认）；网页模式走同源 cookie，行为不变
- 阅读进度、书签仍存本地（localStorage），不跨设备同步
- 服务器需允许桌面壳的跨域请求（`proxy.ts` 已内置 CORS：
  credentials + Authorization 头）

---



```
├─ prisma/                # 数据模型与迁移
├─ src/
│  ├─ app/
│  │  ├─ (public)/        # 前台：书架 / 画匣 / 书桌 / 游戏角
│  │  ├─ admin/           # 后台管理
│  │  └─ api/             # REST API（认证 / 上传 / 文件服务）
│  ├─ components/         # 阅读器、内置游戏、后台组件
│  ├─ lib/                # 数据库、认证、存储
│  └─ middleware.ts       # 后台登录保护
├─ deploy/Caddyfile       # HTTPS 反代示例
├─ Dockerfile
└─ docker-compose.yml
```

## 说明

- 上传大小：容器本身不限制；走 Nginx 反代时记得调大 `client_max_body_size`，
  用自带 Caddy 示例则已配好（2GB）。
- 阅读进度存在**浏览器本地**（localStorage），换设备不会同步。
- 内置游戏由 `src/components/games/` 下的 React 组件实现，想加新游戏照着写一个再加进
  种子列表即可。
