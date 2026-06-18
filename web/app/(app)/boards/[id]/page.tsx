import { BoardPageClient } from "./BoardPageClient";

export function generateStaticParams() {
  return [{ id: "demo" }];
}

export default function BoardPage() {
  return <BoardPageClient />;
}
