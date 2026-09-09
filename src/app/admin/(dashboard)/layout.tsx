"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-base";
import AdminNav from "@/components/admin/AdminNav";

/**
 * 后台布局：客户端会话守卫。
 * 服务器渲染模式里 proxy 仍会先行拦截；这里覆盖桌面静态模式
 * （无服务端），用 /api/auth/me 探测 cookie 与 Bearer 两种凭据。
 */
export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    authFetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        setUsername(d.username);
        setChecked(true);
      })
      .catch(() => {
        if (!alive) return;
        const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
        router.replace(`/admin/login${next}`);
      });
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-fog">正在核对钥匙…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav username={username || "admin"} />
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
