import Link from "next/link";

export default function NotFound() {
  return (
    <div className="lamp-glow flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-4 text-center">
      <p className="font-serif text-6xl text-lamp-2">404</p>
      <h1 className="mt-4 font-serif text-2xl">这个格子里什么也没有</h1>
      <p className="mt-2 text-sm text-fog">书页大概被风吹走了，回书房里找找别的吧。</p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-lamp px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lamp-2"
        >
          回首页
        </Link>
        <Link
          href="/books"
          className="rounded-md border hairline px-5 py-2.5 text-sm text-paper transition-colors hover:border-lamp/50 hover:text-lamp-2"
        >
          去书架逛逛
        </Link>
      </div>
    </div>
  );
}
