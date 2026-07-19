import { useState } from "react";
import Sheet from "./Sheet";
import type { LibraryShelf, Note } from "../types";
import { LIBRARY_SHELVES } from "../types";
import {
  addChecklistItem,
  checklistItems,
  toggleTick,
} from "../lib/checklist";

export type NoteSheetMode =
  | { kind: "edit"; note: Note }
  | { kind: "new"; shelf: LibraryShelf }
  | null;

interface Props {
  mode: NoteSheetMode;
  onSave: (
    id: string,
    patch: {
      title: string;
      text: string;
      shelf: LibraryShelf;
      pinned: boolean;
      checklist: boolean;
      ticked: number[];
    },
  ) => void;
  onCreate: (
    shelf: LibraryShelf,
    title: string,
    text: string,
    pinned: boolean,
    checklist: boolean,
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
  const [checklist, setChecklist] = useState(false);
  const [ticked, setTicked] = useState<number[]>([]);
  const [newItem, setNewItem] = useState("");

  // Sync fields during render, not in an effect — the sheet must never
  // paint a frame of stale content.
  const [lastMode, setLastMode] = useState<NoteSheetMode>(null);
  if (mode !== lastMode) {
    setLastMode(mode);
    setNewItem("");
    if (mode?.kind === "edit") {
      setTitle(mode.note.title);
      setText(mode.note.text);
      setShelf(mode.note.shelf as LibraryShelf);
      setPinned(mode.note.pinned);
      setChecklist(mode.note.checklist);
      setTicked(mode.note.ticked);
    } else if (mode?.kind === "new") {
      setTitle("");
      setText("");
      setShelf(mode.shelf);
      setPinned(false);
      setChecklist(false);
      setTicked([]);
    }
  }

  if (!mode) return null;

  const commit = () => {
    const trimmedTitle = title.trim();
    // Adding one last item then hitting Done shouldn't lose it.
    const body = (
      checklist && newItem.trim() !== ""
        ? addChecklistItem(text, newItem)
        : text
    ).replace(/\s+$/, "");
    if (mode.kind === "new") {
      if (trimmedTitle === "" && body.trim() === "") {
        onClose();
        return;
      }
      onCreate(shelf, trimmedTitle, body, pinned, checklist);
    } else {
      onSave(mode.note.id, {
        title: trimmedTitle,
        text: body,
        shelf,
        pinned,
        checklist,
        ticked: checklist ? ticked : [],
      });
    }
    onClose();
  };

  const items = checklistItems(text, ticked);

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
        {!checklist ? (
          <textarea
            className="sheet-textarea sheet-textarea-grow"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="write"
            aria-label="Note text"
          />
        ) : (
          <div className="check-list" role="list" aria-label="Checklist items">
            {items.map((item) => (
              <button
                key={item.index}
                role="listitem"
                className={`check-item${item.ticked ? " ticked" : ""}`}
                onClick={() => setTicked(toggleTick(ticked, item.index))}
                aria-pressed={item.ticked}
                aria-label={`${item.ticked ? "Untick" : "Tick"} ${item.label}`}
              >
                <span className="check-circle" aria-hidden="true">
                  {item.ticked && (
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 7.5l3 3 6-7"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="check-label">{item.label}</span>
              </button>
            ))}
            <form
              className="check-add"
              onSubmit={(e) => {
                e.preventDefault();
                if (newItem.trim() === "") return;
                setText(addChecklistItem(text, newItem));
                setNewItem("");
              }}
            >
              <div className="field check-add-field">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="add item"
                  aria-label="Add item"
                  autoComplete="off"
                />
              </div>
            </form>
          </div>
        )}

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
            <span className="settings-row-title">Checklist</span>
            <span className="settings-row-sub">every line becomes an item</span>
          </div>
          <button
            className={`switch${checklist ? " on" : ""}`}
            role="switch"
            aria-checked={checklist}
            aria-label="Checklist"
            onClick={() => setChecklist(!checklist)}
          >
            <span className="switch-knob" />
          </button>
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
