import { useState } from "react";
import Sheet from "./Sheet";
import type { LibraryShelf, Note } from "../types";

interface Props {
  note: Note | null;
  people: string[];
  onKeep: (shelf: LibraryShelf, personName?: string) => void;
  onClose: () => void;
}

/**
 * Choose a shelf for a kept jot. Notes and Ideas keep in one tap; People
 * asks who it's about and appends to their page.
 */
export default function KeepSheet({ note, people, onKeep, onClose }: Props) {
  const [askingPerson, setAskingPerson] = useState(false);
  const [name, setName] = useState("");

  // Sync during render so the sheet never paints stale content.
  const [lastNote, setLastNote] = useState<Note | null>(null);
  if (note !== lastNote) {
    setLastNote(note);
    if (note) {
      setAskingPerson(false);
      setName("");
    }
  }

  if (!note) return null;

  const keepToPerson = () => {
    if (name.trim() === "") return;
    onKeep("people", name);
  };

  return (
    <Sheet open={note !== null} title="Keep this jot" onClose={onClose}>
      <p className="sheet-sub keep-preview">{note.text}</p>

      {!askingPerson ? (
        <div className="keep-options">
          <button className="keep-option" onClick={() => onKeep("notes")}>
            <span className="keep-option-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
            </span>
            <span className="keep-option-text">
              <span className="keep-option-title">Notes</span>
              <span className="keep-option-sub">
                plans, inspirations, anything
              </span>
            </span>
          </button>
          <button className="keep-option" onClick={() => onKeep("ideas")}>
            <span className="keep-option-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
            </span>
            <span className="keep-option-text">
              <span className="keep-option-title">Ideas</span>
              <span className="keep-option-sub">the idea dump</span>
            </span>
          </button>
          <button className="keep-option" onClick={() => setAskingPerson(true)}>
            <span className="keep-option-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
            </span>
            <span className="keep-option-text">
              <span className="keep-option-title">People</span>
              <span className="keep-option-sub">
                things to remember about someone
              </span>
            </span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            keepToPerson();
          }}
        >
          <p className="settings-label" id="keep-person-label">
            Who is this about?
          </p>
          <div className="field">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name"
              aria-labelledby="keep-person-label"
              list="people-names"
              autoComplete="off"
            />
            <datalist id="people-names">
              {people.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          {people.length > 0 && (
            <div className="people-suggest">
              {people.slice(0, 6).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip${
                    name.trim().toLowerCase() === p.toLowerCase()
                      ? " chip-active"
                      : ""
                  }`}
                  onClick={() => setName(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="sheet-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={name.trim() === ""}
            >
              Keep
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
