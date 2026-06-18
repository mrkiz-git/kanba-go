"use client";

import { usePathname } from "next/navigation";
import { BoardView } from "@/components/board/BoardView";
import { boardIdFromPath } from "@/lib/board-routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function BoardPageClient() {
  const pathname = usePathname();
  const boardId = boardIdFromPath(pathname);

  if (!boardId) {
    return (
      <EmptyState
        title="Invalid board link"
        description="Choose a board from the sidebar or create a new one."
        action={
          <Link href="/boards/">
            <Button variant="secondary">Go to boards</Button>
          </Link>
        }
      />
    );
  }

  return <BoardView boardId={boardId} />;
}
