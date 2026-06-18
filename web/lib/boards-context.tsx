"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createBoard as createBoardRequest,
  listBoards,
  type BoardSummary,
} from "@/lib/boards";

type BoardsContextValue = {
  boards: BoardSummary[];
  loading: boolean;
  refreshBoards: () => Promise<void>;
  createBoard: (name: string) => Promise<BoardSummary>;
};

const BoardsContext = createContext<BoardsContextValue | null>(null);

export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshBoards = useCallback(async () => {
    const res = await listBoards();
    setBoards(res.boards ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await listBoards();
        if (active) {
          setBoards(res.boards ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const createBoard = useCallback(
    async (name: string) => {
      const board = await createBoardRequest(name);
      const summary: BoardSummary = {
        id: board.id,
        name: board.name,
        permission: "owner",
        version: board.version,
        updatedAt: board.updatedAt,
      };
      setBoards((prev) => [summary, ...prev]);
      return summary;
    },
    [],
  );

  const value = useMemo(
    () => ({
      boards,
      loading,
      refreshBoards,
      createBoard,
    }),
    [boards, loading, refreshBoards, createBoard],
  );

  return <BoardsContext.Provider value={value}>{children}</BoardsContext.Provider>;
}

export function useBoards() {
  const ctx = useContext(BoardsContext);
  if (!ctx) {
    throw new Error("useBoards must be used within BoardsProvider");
  }
  return ctx;
}
