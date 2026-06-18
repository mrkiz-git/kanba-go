"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { boardHref } from "@/lib/board-routes";
import { useBoards } from "@/lib/boards-context";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function boardLinkActive(pathname: string, boardId: string) {
  const href = boardHref(boardId);
  return pathname === href || pathname === `/boards/${boardId}`;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { boards, createBoard } = useBoards();
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const owned = boards.filter((board) => board.permission === "owner");
  const shared = boards.filter((board) => board.permission !== "owner");

  async function handleCreateBoard() {
    const name = newBoardName.trim();
    if (!name) {
      return;
    }
    setCreating(true);
    try {
      const board = await createBoard(name);
      setNewBoardName("");
      setShowCreate(false);
      onClose();
      router.push(boardHref(board.id));
    } finally {
      setCreating(false);
    }
  }

  function renderBoardList(items: typeof boards, emptyLabel: string) {
    if (items.length === 0) {
      return <p className="mt-2 px-2 text-sm text-slate-600">{emptyLabel}</p>;
    }
    return (
      <ul className="mt-2 space-y-1">
        {items.map((board) => {
          const href = boardHref(board.id);
          const active = boardLinkActive(pathname, board.id);
          return (
            <li key={board.id}>
              <Link
                href={href}
                className={`block rounded px-2 py-2 text-sm ${
                  active
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
                onClick={onClose}
              >
                {board.name}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-slate-100 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-5">
          <Link href="/boards/" className="text-xl font-bold text-slate-900">
            Kanba
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            My Boards
          </p>
          {renderBoardList(owned, "No boards yet.")}

          {shared.length > 0 ? (
            <>
              <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Shared with me
              </p>
              {renderBoardList(shared, "")}
            </>
          ) : null}

          {showCreate ? (
            <form
              className="mt-4 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateBoard();
              }}
            >
              <input
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-600"
                placeholder="Board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={creating || !newBoardName.trim()}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                  onClick={() => {
                    setShowCreate(false);
                    setNewBoardName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="mt-4 w-full rounded px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-200"
              onClick={() => setShowCreate(true)}
            >
              + New Board
            </button>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-4">
          {user?.role === "admin" ? (
            <Link
              href="/admin/users/"
              className="mb-3 block text-sm text-slate-700 hover:text-slate-900"
            >
              Admin
            </Link>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {user ? initials(user.name) : "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.name ?? "Guest"}</p>
              <button
                type="button"
                className="text-xs text-slate-600 hover:text-slate-900"
                onClick={() => logout()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
