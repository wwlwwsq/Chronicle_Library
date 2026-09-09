// 隐藏 Windows release 构建的控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 前端静态站点（out/）由 tauri.conf.json 的 build.frontendDist 提供，
// Tauri 内置资产协议对未命中路径自动回落 index.html（SPA fallback）。
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
