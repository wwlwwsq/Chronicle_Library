import { Suspense } from "react";
import BlogClient from "./blog-client";

export const metadata = { title: "随笔" };

export default function BlogPage() {
  return (
    <Suspense>
      <BlogClient />
    </Suspense>
  );
}
