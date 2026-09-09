import { Suspense } from "react";
import PoemsClient from "./poems-client";

export const metadata = { title: "诗词" };

export default function PoemsPage() {
  return (
    <Suspense>
      <PoemsClient />
    </Suspense>
  );
}
