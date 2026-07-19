import { useState } from "react";
import Sheet from "./Sheet";
import type { LibraryShelf, Note } from "../types";
import { LIBRARY_SHELVES } from "../types";

export type NoteSheetMode =
  | { kind: "edit"; note: Note }
  | { kind: "new"; shelf: LibraryShelf }
  | null;

interface Props {
  mode: NoteSheetMode;
  onSave: (
    id: string,
    patch: { title: string; text: string; shelf: LibraryShelf; pinned: boolean },
  ) => void;
  onCreate: (
    shelf: LibraryShelf,
    title: string,
    text: string,
    pinned: boolean,
  ) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const SHELF_LABELS: Record<LibraryShelf, string> = {
  notes: "Notes",
  ideas: "Ideas",
  people: "People",
};

/** The Library note editor: title, body, shelf, pin — one tall sheet. */
export default function NoteSheet({
  mode,
  onSave,
  onCreate,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [shelf, setShelf] = useState<LibraryShelf>("notes");
  const [pinned, setPinned] = useState(false);

  // Sync fields during render, not in an effect — the sheet must never
  // paint a frame of stale content.
  const [lastMode, setLastMode] = useState<NoteSheetMode>(null);
  if (mode !== lastMode) {
    setLastMode(mode);
    if (mode?.kind === "edit") {
      setTitle(mode.note.title);
      setText(mode.note.text);
      setShelf(mode.note.shelf as LibraryShelf);
      setPinned(mode.note.pinned);
    } else if (mode?.kind === "new") {
      setTitle("");
      setText("");
      setShelf(mode.shelf);
      setPinned(false);
    }
  }

  if (!mode) return null;

  const commit = () => {
    const trimmedTitle = title.trim();
    const body = text.replace(/\s+$/, "");
    if (mode.kind === "new") {
      if (trimmedTitle === "" && body.trim() === "") {
        onClose();
        return;
      }
      onCreate(shelf, trimmedTitle, body, pinned);
    } else {
      onSave(mode.note.id, {
        title: trimmedTitle,
        text: body,
        shelf,
        pinned,
      });
    }
    onClose();
  };

  return (
    <Sheet
      open={mode !== null}
      title={mode.kind === "new" ? "New note" : "Edit note"}
      onClose={onClose}
      tall
    >
      <div className="sheet-body">
        <div className="field sheet-name">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={shelf === "people" ? "name" : "title (optional)"}
            aria-label={shelf === "people" ? "Person's name" : "Title"}
          />
        </div>
        <textarea
          className="sheet-textarea sheet-textarea-grow"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="write"
          aria-label="Note text"
        />

        <p className="settings-label">Shelf</p>
        <div className="seg" role="radiogroup" aria-label="Shelf">
          {LIBRARY_SHELVES.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={shelf === s}
              className={`seg-btn${shelf === s ? " active" : ""}`}
              onClick={() => setShelf(s)}
            >
              {SHELF_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Pinned</span>
            <span className="settings-row-sub">stays at the top of its shelf</span>
          </div>
          <button
            className={`switch${pinned ? " on" : ""}`}
            role="switch"
            aria-checked={pinned}
            aria-label="Pinned"
            onClick={() => setPinned(!pinned)}
          >
            <span className="switch-knob" />
          </button>
        </div>

        <div className="sheet-actions">
          <button className="primary-btn" onClick={commit}>
            Done
          </button>
          {mode.kind === "edit" && (
            <button
              className="sheet-secondary"
              onClick={() => {
                onDelete(mode.note.id);
                onClose();
              }}
            >
              Delete note
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
