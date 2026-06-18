import { BoardPageClient } from "./BoardPageClient";

export function generateStaticParams() {
  return [{ id: "demo" }];
}

type BoardPageProps = {
  params: Promise<{ id: string }>;
};

export default function BoardPage({ params }: BoardPageProps) {
  return <BoardPageClient params={params} />;
}
