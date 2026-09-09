#!/usr/bin/env node
/**
 * 桌面模式构建：BUILD_STATIC=1 next build
 * Windows 下 npm script 不支持内联环境变量，统一走本脚本。
 *
 * 用法：
 *   node scripts/build-desktop.mjs                     # API 地址取 DESKTOP_API_URL 或跳过
 *   DESKTOP_API_URL=https://your-domain.com node scripts/build-desktop.mjs
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const apiBase = process.env.DESKTOP_API_URL || "";
if (!apiBase) {
  console.warn(
    "[build-desktop] 未设置 DESKTOP_API_URL：将按同源模式导出静态站点。\n" +
      "  桌面应用需要远程 API 时请设置，例如：\n" +
      "  DESKTOP_API_URL=https://your-domain.com node scripts/build-desktop.mjs"
  );
}

const isWin = process.platform === "win32";
const npxCmd = isWin ? "npx.cmd" : "npx";

const result = spawnSync(npxCmd, ["next", "build"], {
  stdio: "inherit",
  shell: isWin,
  env: {
    ...process.env,
    BUILD_STATIC: "1",
    NEXT_PUBLIC_API_BASE: apiBase,
  },
});

process.exit(result.status ?? 1);
