import { Suspense } from "react";
import PostClient from "./post-client";

export const metadata = { title: "随笔" };

/**
 * 桌面静态导出（output: "export"）要求每个动态路由至少生成一个页面。
 * 数据全部由客户端 fetch——构建期只生成一个占位页（blog/app.html），
 * 运行时任意 /blog/:slug 由桌面壳回落到该占位页，客户端按真实 URL 渲染。
 */
export function generateStaticParams() {
  return [{ slug: "app" }];
}

export default function PostPage() {
  return (
    <Suspense>
      <PostClient />
    </Suspense>
  );
}
