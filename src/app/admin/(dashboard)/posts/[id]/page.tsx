import PostEditor from "@/components/admin/PostEditor";

export const metadata = { title: "编辑随笔" };

/**
 * 桌面静态导出（output: "export"）要求每个动态路由至少生成一个页面。
 * 编辑器数据由客户端 fetch——构建期只生成占位页（admin/posts/app.html），
 * 运行时任意 /admin/posts/:id 由桌面壳回落到该占位页，客户端按真实 URL 渲染。
 */
export function generateStaticParams() {
  return [{ id: "app" }];
}

export default function Page() {
  return <PostEditor />;
}
