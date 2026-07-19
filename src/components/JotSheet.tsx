import { useState } from "react";
import Sheet from "./Sheet";
import type { Note } from "../types";
import { remainingLabel } from "../lib/notes";

interface Props {
  note: Note | null;
  onSave: (id: string, text: string, expiresAt: number | null | undefined) => void;
  /** File this jot onto a shelf, carrying any text edits along. */
  onKeep: (id: string, shelf: "notes" | "ideas" | "people", text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

type TimerChoice = "off" | "24" | "48";

/** Edit a stream jot: its text, its disappearing timer, or keep it. */
export default function JotSheet({
  note,
  onSave,
  onKeep,
  onDelete,
  onClose,
}: Props) {
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

        <p className="settings-label">Keep</p>
        <div className="keep-chips">
          {(["notes", "ideas", "people"] as const).map((shelf) => (
            <button
              key={shelf}
              className="keep-chip"
              disabled={text.trim() === ""}
              onClick={() => onKeep(note.id, shelf, text.trim())}
            >
              <span className="keep-chip-icon" aria-hidden="true">
                {shelf === "notes" && (
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                    <rect
                      x="3"
                      y="2.5"
                      width="12"
                      height="13"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M6 6.5h6M6 9.5h6M6 12.5h3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {shelf === "ideas" && (
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M9 1.5a5 5 0 00-2.8 9.14c.55.38.8 1 .8 1.61v.25h4v-.25c0-.61.25-1.23.8-1.61A5 5 0 009 1.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7.25 15h3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {shelf === "people" && (
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                    <circle
                      cx="9"
                      cy="6"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3.5 15.5c.7-2.9 2.9-4.5 5.5-4.5s4.8 1.6 5.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </span>
              {shelf === "notes" ? "Notes" : shelf === "ideas" ? "Ideas" : "People"}
            </button>
          ))}
        </div>

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
