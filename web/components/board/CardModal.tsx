"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/Button";
import { replaceCardFieldPatch } from "@/lib/board-patch";
import type { Board, Card, Column } from "@/lib/boards";
import { patchBoard } from "@/lib/boards";

type CardModalProps = {
  board: Board;
  columnId: string;
  card: Card;
  readOnly: boolean;
  onClose: () => void;
  onSaved: (board: Board) => void;
};

export function CardModal({
  board,
  columnId,
  card,
  readOnly,
  onClose,
  onSaved,
}: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? "");
  }, [card]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const patches = [
        ...replaceCardFieldPatch(board.columns, columnId, card.id, "title", title.trim()),
        ...replaceCardFieldPatch(
          board.columns,
          columnId,
          card.id,
          "description",
          description,
        ),
      ];
      const updated = await patchBoard(board.id, board.version, patches);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <input
            className="w-full border-0 text-xl font-semibold text-slate-900 outline-none focus:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={readOnly}
            aria-label="Card title"
          />
          <button
            type="button"
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${!preview ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setPreview(false)}
          >
            Edit
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${preview ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>

        {preview ? (
          <div className="prose prose-sm max-w-none rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {description || "_No description_"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="min-h-40 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-600"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            readOnly={readOnly}
            placeholder="Add a Markdown description…"
          />
        )}

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!readOnly ? (
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function findCardColumn(columns: Column[], cardId: string): Column | undefined {
  return columns.find((col) => col.cards.some((card) => card.id === cardId));
}
