"use client";

import { use } from "react";
import { BoardView } from "@/components/board/BoardView";

type BoardPageClientProps = {
  params: Promise<{ id: string }>;
};

export function BoardPageClient({ params }: BoardPageClientProps) {
  const { id } = use(params);
  return <BoardView boardId={id} />;
}
