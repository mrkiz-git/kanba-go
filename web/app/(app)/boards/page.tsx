"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useBoards } from "@/lib/boards-context";

export default function BoardListPage() {
  const router = useRouter();
  const { boards, loading, createBoard } = useBoards();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && boards.length > 0) {
      router.replace(`/boards/${boards[0].id}/`);
    }
  }, [boards, loading, router]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setCreating(true);
    setError("");
    try {
      const board = await createBoard(trimmed);
      router.replace(`/boards/${board.id}/`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  if (loading || boards.length > 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
        Loading boards…
      </div>
    );
  }

  return (
    <EmptyState
      title="No boards yet"
      description="Create your first Kanban board to start organizing work."
      action={
        <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={handleCreate}>
          <input
            className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
            placeholder="Board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? "Creating…" : "+ New Board"}
          </Button>
        </form>
      }
    />
  );
}
