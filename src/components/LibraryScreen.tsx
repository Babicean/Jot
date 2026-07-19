import type { Note } from "../types";
import { libraryNotes, type LibraryFilter } from "../lib/notes";

interface Props {
  notes: Note[];
  filter: LibraryFilter;
  trashCount: number;
  onSetFilter: (filter: LibraryFilter) => void;
  onOpen: (note: Note) => void;
  onNew: () => void;
  onTogglePinned: (id: string) => void;
  onOpenTrash: () => void;
}

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "ideas", label: "Ideas" },
  { id: "people", label: "People" },
];

const SHELF_NAMES: Record<string, string> = {
  notes: "Notes",
  ideas: "Ideas",
  people: "People",
};

const EMPTY_COPY: Record<LibraryFilter, string> = {
  all: "Keep a jot and it lands here.",
  notes: "Plans, inspirations, anything worth keeping.",
  ideas: "The idea dump. Pin the good ones.",
  people: "A page per person, for the things worth remembering.",
};

/** The keeper shelves: everything promoted from the stream or written here. */
export default function LibraryScreen({
  notes,
  filter,
  trashCount,
  onSetFilter,
  onOpen,
  onNew,
  onTogglePinned,
  onOpenTrash,
}: Props) {
  const list = libraryNotes(notes, filter);

  return (
    <div className="screen">
      <div className="lib-head">
        <h1 className="lib-title">Library</h1>
        <button className="lib-add" onClick={onNew}>
          + New note
        </button>
      </div>

      <div className="seg seg-4 filter-row" role="radiogroup" aria-label="Shelf">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="radio"
            aria-checked={filter === f.id}
            className={`seg-btn${filter === f.id ? " active" : ""}`}
            onClick={() => onSetFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <svg
            className="empty-icon"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14 8h24a2 2 0 012 2v34a1 1 0 01-1.55.83L26 36l-12.45 8.83A1 1 0 0112 44V10a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              opacity="0.6"
            />
          </svg>
          <p className="empty-title">{EMPTY_COPY[filter]}</p>
        </div>
      ) : (
        <div className="card lib-list">
          {list.map((note) => {
            const heading = note.title.trim() || note.text.split("\n")[0];
            const preview =
              note.title.trim() !== ""
                ? note.text.split("\n").find((l) => l.trim() !== "") ?? ""
                : note.text.split("\n").slice(1).join(" ");
            return (
              <div key={note.id} className="lib-row">
                <button
                  className={`pin-btn${note.pinned ? " pinned" : ""}`}
                  onClick={() => onTogglePinned(note.id)}
                  aria-label={note.pinned ? `Unpin ${heading}` : `Pin ${heading}`}
                  aria-pressed={note.pinned}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill={note.pinned ? "currentColor" : "none"}
                    aria-hidden="true"
                  >
                    <path
                      d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.6z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button className="lib-main" onClick={() => onOpen(note)}>
                  <span className="lib-text">
                    <span className="lib-name">{heading || "Untitled"}</span>
                    {(preview || filter === "all") && (
                      <span className="lib-detail">
                        {filter === "all" && (
                          <span className="lib-shelf">
                            {SHELF_NAMES[note.shelf]}
                          </span>
                        )}
                        {filter === "all" && preview && " · "}
                        {preview}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {trashCount > 0 && (
        <button className="trash-link" onClick={onOpenTrash}>
          Trash · {trashCount}
        </button>
      )}
    </div>
  );
}
