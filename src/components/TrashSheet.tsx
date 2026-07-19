import Sheet from "./Sheet";
import type { Note } from "../types";
import { clearsInLabel } from "../lib/notes";

interface Props {
  open: boolean;
  trash: Note[];
  now: number;
  onRestore: (note: Note) => void;
  onEmpty: () => void;
  onClose: () => void;
}

const SHELF_NAMES: Record<string, string> = {
  stream: "jot",
  notes: "Notes",
  ideas: "Ideas",
  people: "People",
};

/** Deleted notes wait here for 30 days, restorable, then clear themselves. */
export default function TrashSheet({
  open,
  trash,
  now,
  onRestore,
  onEmpty,
  onClose,
}: Props) {
  return (
    <Sheet open={open} title="Trash" onClose={onClose}>
      <p className="sheet-sub">deleted notes clear after 30 days</p>

      {trash.length === 0 ? (
        <p className="trash-empty">nothing in the trash</p>
      ) : (
        <>
          <div className="trash-list">
            {trash.map((note) => {
              const label =
                note.title.trim() ||
                note.text.split("\n").find((l) => l.trim() !== "") ||
                "Untitled";
              return (
                <div key={note.id} className="trash-row">
                  <span className="lib-text">
                    <span className="lib-name">{label}</span>
                    <span className="lib-detail">
                      {SHELF_NAMES[note.shelf]} ·{" "}
                      {clearsInLabel(note.deletedAt!, now)}
                    </span>
                  </span>
                  <button
                    className="trash-restore"
                    onClick={() => onRestore(note)}
                    aria-label={`Restore ${label}`}
                  >
                    restore
                  </button>
                </div>
              );
            })}
          </div>
          <div className="sheet-actions">
            <button className="sheet-secondary" onClick={onEmpty}>
              Empty trash
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
