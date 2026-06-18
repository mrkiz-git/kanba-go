"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { CardModal, findCardColumn } from "@/components/board/CardModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { addCardPatch, addColumnPatch, moveCardPatch, replaceBoardNamePatch } from "@/lib/board-patch";
import { APIError } from "@/lib/api";
import {
  deleteBoard,
  getBoard,
  isReadOnly,
  listBoards,
  patchBoard,
  type Board,
  type Card,
  type JsonPatchOp,
} from "@/lib/boards";
import { useBoards } from "@/lib/boards-context";

type BoardViewProps = {
  boardId: string;
};

export function BoardView({ boardId }: BoardViewProps) {
  const router = useRouter();
  const { boards, refreshBoards } = useBoards();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<{ columnId: string; card: Card } | null>(
    null,
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [showCardPicker, setShowCardPicker] = useState(false);
  const addColumnRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  const permission = boards.find((item) => item.id === boardId)?.permission;
  const readOnly = isReadOnly(permission);

  const loadBoard = useCallback(async () => {
    setError("");
    try {
      const data = await getBoard(boardId);
      setBoard(data);
      setTitleDraft(data.name);
    } catch (err) {
      if (err instanceof APIError && err.status === 404) {
        setError("Board not found");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load board");
      }
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    void loadBoard();
    void refreshBoards();
  }, [loadBoard, refreshBoards]);

  useEffect(() => {
    if (!showCardPicker) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-card-picker]")) {
        setShowCardPicker(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showCardPicker]);

  function startAddCard(columnId: string) {
    setShowCardPicker(false);
    setAddingCardColumnId(columnId);
    setNewCardTitle("");
  }

  function startAddColumn() {
    setAddingColumn(true);
    setNewColumnTitle("");
    requestAnimationFrame(() => {
      addColumnRef.current?.scrollIntoView({ behavior: "smooth", inline: "end" });
    });
  }

  async function handleBoardNotFound() {
    const latest = await listBoards();
    if (latest.boards.some((item) => item.id === boardId)) {
      setLoading(true);
      await loadBoard();
      return;
    }
    await refreshBoards();
    router.replace("/boards/");
  }

  async function applyPatch(patch: JsonPatchOp[], optimistic: Board) {
    if (!board) {
      return;
    }
    setBoard(optimistic);
    try {
      const updated = await patchBoard(board.id, board.version, patch);
      setBoard(updated);
      await refreshBoards();
    } catch (err) {
      setBoard(board);
      if (err instanceof APIError && err.status === 409) {
        await loadBoard();
        setError("Board changed elsewhere. Refreshed to the latest version.");
      } else {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    }
  }

  function handleDragEnd(result: DropResult) {
    if (!board || readOnly || !result.destination) {
      return;
    }
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const next = structuredClone(board);
    const sourceCol = next.columns.find((col) => col.id === source.droppableId);
    const destCol = next.columns.find((col) => col.id === destination.droppableId);
    if (!sourceCol || !destCol) {
      return;
    }

    const [moved] = sourceCol.cards.splice(source.index, 1);
    destCol.cards.splice(destination.index, 0, moved);
    sourceCol.cards.forEach((card, index) => {
      card.position = index;
    });
    destCol.cards.forEach((card, index) => {
      card.position = index;
    });

    const patch = moveCardPatch(
      board.columns,
      source.droppableId,
      source.index,
      destination.droppableId,
      destination.index,
    );
    void applyPatch(patch, next);
  }

  async function handleAddCard(columnId: string, title = "New card") {
    if (!board || readOnly) {
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    const colIdx = board.columns.findIndex((col) => col.id === columnId);
    if (colIdx < 0) {
      return;
    }
    const patch = addCardPatch(colIdx, trimmed);
    try {
      const updated = await patchBoard(board.id, board.version, patch);
      setBoard(updated);
      setAddingCardColumnId(null);
      setNewCardTitle("");
    } catch (err) {
      if (err instanceof APIError && err.status === 409) {
        await loadBoard();
      }
      setError(err instanceof Error ? err.message : "Failed to add card");
    }
  }

  async function handleAddColumn(title = "New column") {
    if (!board || readOnly) {
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    if (board.columns.length >= 20) {
      setError("A board can have at most 20 columns");
      return;
    }
    const patch = addColumnPatch(trimmed);
    try {
      const updated = await patchBoard(board.id, board.version, patch);
      setBoard(updated);
      setAddingColumn(false);
      setNewColumnTitle("");
    } catch (err) {
      if (err instanceof APIError && err.status === 409) {
        await loadBoard();
      }
      setError(err instanceof Error ? err.message : "Failed to add column");
    }
  }

  async function handleRenameBoard() {
    if (!board || readOnly || titleDraft.trim() === board.name) {
      setEditingTitle(false);
      return;
    }
    try {
      const updated = await patchBoard(
        board.id,
        board.version,
        replaceBoardNamePatch(titleDraft.trim()),
      );
      setBoard(updated);
      await refreshBoards();
      setEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename board");
    }
  }

  async function handleDeleteBoard() {
    if (!board || permission !== "owner") {
      return;
    }
    if (!window.confirm(`Delete board "${board.name}"?`)) {
      return;
    }
    try {
      await deleteBoard(board.id);
      await refreshBoards();
      router.replace("/boards/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
        Loading board…
      </div>
    );
  }

  if (error && !board) {
    return (
      <EmptyState
        title="Unable to load board"
        description={error}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => void handleBoardNotFound()}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => router.push("/boards/")}>
              Back to boards
            </Button>
          </div>
        }
      />
    );
  }

  if (!board) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editingTitle && !readOnly ? (
              <input
                className="w-full max-w-md rounded border border-slate-200 px-2 py-1 text-xl font-semibold text-slate-900 outline-none focus:border-blue-600"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => void handleRenameBoard()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleRenameBoard();
                  }
                  if (e.key === "Escape") {
                    setTitleDraft(board.name);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="truncate text-left text-xl font-semibold text-slate-900 hover:text-blue-700"
                onClick={() => !readOnly && setEditingTitle(true)}
                disabled={readOnly}
              >
                {board.name}
              </button>
            )}
            {readOnly ? (
              <p className="mt-1 text-xs text-slate-500">Read-only access</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <>
                <div className="relative" data-card-picker>
                  <Button type="button" onClick={() => setShowCardPicker((open) => !open)}>
                    + Add card
                  </Button>
                  {showCardPicker ? (
                    <div
                      className="absolute right-0 z-20 mt-2 min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-md"
                      data-card-picker
                    >
                      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Choose column
                      </p>
                      {board.columns.map((column) => (
                        <button
                          key={column.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => startAddCard(column.id)}
                        >
                          {column.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button type="button" variant="secondary" onClick={startAddColumn}>
                  + Add column
                </Button>
              </>
            ) : null}
            {permission === "owner" ? (
              <Button variant="ghost" onClick={() => void handleDeleteBoard()}>
                Delete board
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div ref={boardScrollRef} className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => (
            <div
              key={column.id}
              className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100"
            >
              <div className="flex items-center justify-between px-3 py-3">
                <h2 className="text-lg font-semibold text-slate-900">{column.title}</h2>
                <span className="text-xs text-slate-600">{column.cards.length}</span>
              </div>

              <Droppable droppableId={column.id} isDropDisabled={readOnly}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex min-h-32 flex-1 flex-col gap-2 px-2 pb-2 ${
                      snapshot.isDraggingOver ? "bg-blue-50/60" : ""
                    }`}
                  >
                    {column.cards.length === 0 &&
                    !readOnly &&
                    addingCardColumnId !== column.id ? (
                      <button
                        type="button"
                        className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-6 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
                        onClick={() => startAddCard(column.id)}
                      >
                        + Add first card
                      </button>
                    ) : null}
                    {column.cards.map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <button
                            type="button"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow ${
                              dragSnapshot.isDragging ? "shadow-lg" : ""
                            }`}
                            onClick={() => setSelectedCard({ columnId: column.id, card })}
                          >
                            <p className="text-sm font-medium text-slate-900">{card.title}</p>
                            {card.description ? (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                                {card.description}
                              </p>
                            ) : null}
                          </button>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {!readOnly ? (
                addingCardColumnId === column.id ? (
                  <form
                    className="mx-2 mb-3 space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleAddCard(column.id, newCardTitle);
                    }}
                  >
                    <input
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-600"
                      placeholder="Card title"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      maxLength={200}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="px-3 py-1 text-xs" disabled={!newCardTitle.trim()}>
                        Add card
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => {
                          setAddingCardColumnId(null);
                          setNewCardTitle("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="mx-2 mb-3 rounded border border-slate-200 bg-white px-2 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
                    onClick={() => startAddCard(column.id)}
                  >
                    + Add a card
                  </button>
                )
              ) : null}
            </div>
          ))}

          {!readOnly ? (
            <div ref={addColumnRef}>
              {addingColumn ? (
              <form
                className="flex w-72 shrink-0 flex-col rounded-lg border border-dashed border-slate-300 bg-white p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAddColumn(newColumnTitle);
                }}
              >
                <input
                  className="rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-600"
                  placeholder="Column title"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <Button type="submit" className="px-3 py-1 text-xs" disabled={!newColumnTitle.trim()}>
                    Add column
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1 text-xs"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="flex h-fit w-72 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-10 text-sm font-medium text-blue-700 hover:bg-blue-50"
                onClick={startAddColumn}
              >
                + Add column
              </button>
            )}
            </div>
          ) : null}
        </div>
      </DragDropContext>

      {selectedCard ? (
        <CardModal
          board={board}
          columnId={selectedCard.columnId}
          card={selectedCard.card}
          readOnly={readOnly}
          onClose={() => setSelectedCard(null)}
          onSaved={(updated) => {
            setBoard(updated);
            const col = findCardColumn(updated.columns, selectedCard.card.id);
            const card = col?.cards.find((item) => item.id === selectedCard.card.id);
            if (card && col) {
              setSelectedCard({ columnId: col.id, card });
            }
          }}
        />
      ) : null}
    </div>
  );
}
