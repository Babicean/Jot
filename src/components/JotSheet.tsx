import { useState } from "react";
import Sheet from "./Sheet";
import type { Note } from "../types";
import { remainingLabel } from "../lib/notes";

interface Props {
  note: Note | null;
  onSave: (id: string, text: string, expiresAt: number | null | undefined) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

type TimerChoice = "off" | "24" | "48";

/** Edit a stream jot: its text, and its disappearing timer. */
export default function JotSheet({ note, onSave, onDelete, onClose }: Props) {
  const [text, setText] = useState("");
  // undefined = untouched; otherwise the new choice, applied from "now".
  const [timer, setTimer] = useState<TimerChoice | undefined>(undefined);

  // Sync during render so the sheet never paints stale content.
  const [lastNote, setLastNote] = useState<Note | null>(null);
  if (note !== lastNote) {
    setLastNote(note);
    if (note) {
      setText(note.text);
      setTimer(undefined);
    }
  }

  if (!note) return null;

  const activeTimer: TimerChoice =
    timer ??
    (note.expiresAt === null
      ? "off"
      : note.expiresAt - Date.now() <= 24 * 3600_000
        ? "24"
        : "48");

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") {
      onClose();
      return;
    }
    let expiresAt: number | null | undefined = undefined;
    if (timer !== undefined) {
      expiresAt = timer === "off" ? null : Date.now() + Number(timer) * 3600_000;
    }
    onSave(note.id, trimmed, expiresAt);
    onClose();
  };

  return (
    <Sheet open={note !== null} title="Edit jot" onClose={onClose}>
      <div className="sheet-body">
        <textarea
          className="sheet-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          aria-label="Jot text"
        />

        <p className="settings-label">Disappears</p>
        <div className="seg" role="radiogroup" aria-label="Disappears">
          {(["off", "24", "48"] as const).map((choice) => (
            <button
              key={choice}
              role="radio"
              aria-checked={activeTimer === choice}
              className={`seg-btn${activeTimer === choice ? " active" : ""}`}
              onClick={() => setTimer(choice)}
            >
              {choice === "off" ? "Off" : `${choice}h`}
            </button>
          ))}
        </div>
        {note.expiresAt !== null && timer === undefined && (
          <p className="sheet-hint">
            disappears in {remainingLabel(note.expiresAt, Date.now())}
          </p>
        )}

        <div className="sheet-actions">
          <button className="primary-btn" onClick={commit}>
            Done
          </button>
          <button
            className="sheet-secondary"
            onClick={() => {
              onDelete(note.id);
              onClose();
            }}
          >
            Delete jot
          </button>
        </div>
      </div>
    </Sheet>
  );
}
