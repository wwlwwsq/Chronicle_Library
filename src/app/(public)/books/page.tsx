import { Suspense } from "react";
import BooksClient from "./books-client";

export const metadata = { title: "书架" };

export default function BooksPage() {
  return (
    <Suspense>
      <BooksClient />
    </Suspense>
  );
}
