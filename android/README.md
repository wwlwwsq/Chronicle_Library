# MyBook Android 壳

拾光书房的安卓客户端，架构与桌面壳 `desktop/main.cjs` 完全一致：

- **内嵌 HTTP 服务器**（`WebServer.java`，NanoHTTPD）：托管 `assets/web/` 里的静态导出站点，
  未命中的无扩展名路径回退 `index.html`（SPA 路由）；`/api/*` 流式反代到远端后端，
  因此前端始终同源访问 API，登录凭据 cookie（127.0.0.1）+ Bearer（localStorage）双通道都可用。
- **MainActivity**：WebView 加载本地服务器，处理系统返回键（Web 历史）、外链跳系统浏览器、
  管理后台上传用的系统文件选择器。

## 构建步骤

```bash
# 1. 构建静态导出（同源模式，不设 DESKTOP_API_URL）
node scripts/build-desktop.mjs

# 2. 拷入安卓 assets
mkdir -p android/app/src/main/assets/web
cp -r out/. android/app/src/main/assets/web/

# 3. 编译 APK（需要 JDK 17+ 与 ANDROID_HOME；Gradle 9+）
cd android
gradle assembleRelease        # 产物：app/build/outputs/apk/release/app-release.apk
```

本机没有全局 gradle 时，可用 `~/.gradle/wrapper/dists/gradle-9.5.1-bin/*/gradle-9.5.1/bin/gradle`。

## 关键配置

- **后端地址**：`app/build.gradle.kts` 里的 `buildConfigField("String", "API_BASE", ...)`。
  改后端地址只需改这一行并重新打 APK，静态站点无需重建。
- **签名**：`mybook-release.keystore` 随仓库提交（自签名，个人应用），口令 `mybook2026`，
  别名 `mybook`。升级版本必须沿用同一密钥，否则用户无法覆盖安装。
- **明文流量**：后端目前是 `http://IP:端口`，`AndroidManifest.xml` 开了
  `usesCleartextTraffic`。后端上 HTTPS 后建议改为 `networkSecurityConfig` 白名单并收紧。
- **静态产物不入库**：`assets/web/` 在 `.gitignore` 中，由第 1、2 步重新生成。
