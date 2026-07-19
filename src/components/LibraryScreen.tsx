import { useEffect, useState } from "react";
import type { Note } from "../types";
import { libraryNotes, type LibraryFilter } from "../lib/notes";
import { searchNotes } from "../lib/search";
import { formatDayLabel } from "../lib/format";

interface Props {
  notes: Note[];
  filter: LibraryFilter;
  trashCount: number;
  onSetFilter: (filter: LibraryFilter) => void;
  onOpen: (note: Note) => void;
  /** Stream jots found by search open in the jot sheet, not the editor. */
  onOpenJot: (note: Note) => void;
  onNew: () => void;
  onTogglePinned: (id: string) => void;
  onOpenTrash: () => void;
}

const SEARCH_DEBOUNCE_MS = 150;

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
const GROUP_LABELS: Record<string, string> = {
  stream: "Stream",
  notes: "Notes",
  ideas: "Ideas",
  people: "People",
};

export default function LibraryScreen({
  notes,
  filter,
  trashCount,
  onSetFilter,
  onOpen,
  onOpenJot,
  onNew,
  onTogglePinned,
  onOpenTrash,
}: Props) {
  const list = libraryNotes(notes, filter);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebounced(query),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [query]);

  const searching = debounced.trim() !== "";
  const results = searching ? searchNotes(notes, debounced) : [];

  return (
    <div className="screen">
      <div className="lib-head">
        <h1 className="lib-title">Library</h1>
        <button className="lib-add" onClick={onNew}>
          + New note
        </button>
      </div>

      <div className="field search-field">
        <svg
          className="search-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search everything"
          aria-label="Search everything"
          autoComplete="off"
        />
        {query !== "" && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery("");
              setDebounced("");
            }}
            aria-label="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {searching ? (
        results.length === 0 ? (
          <div className="card empty">
            <p className="empty-title">nothing matches</p>
          </div>
        ) : (
          results.map((group) => (
            <section key={group.shelf}>
              <h2 className="section-label">{GROUP_LABELS[group.shelf]}</h2>
              <div className="card lib-list">
                {group.notes.map((note) => {
                  const heading =
                    note.title.trim() || note.text.split("\n")[0] || "Untitled";
                  const sub =
                    note.shelf === "stream"
                      ? formatDayLabel(note.day)
                      : note.title.trim() !== ""
                        ? note.text.split("\n").find((l) => l.trim() !== "") ?? ""
                        : note.text.split("\n").slice(1).join(" ");
                  return (
                    <div key={note.id} className="lib-row">
                      <button
                        className="lib-main search-main"
                        onClick={() =>
                          note.shelf === "stream"
                            ? onOpenJot(note)
                            : onOpen(note)
                        }
                      >
                        <span className="lib-text">
                          <span className="lib-name">{heading}</span>
                          {sub && <span className="lib-detail">{sub}</span>}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
