import { Suspense } from "react";
import ComicsClient from "./comics-client";

export const metadata = { title: "画匣" };

export default function ComicsPage() {
  return (
    <Suspense>
      <ComicsClient />
    </Suspense>
  );
}
