import { useEffect, useRef, useState } from "react";
import type { Note } from "../types";
import type { DayGroup } from "../lib/notes";
import { remainingLabel } from "../lib/notes";
import { formatDayLabel, formatTime } from "../lib/format";

interface Props {
  groups: DayGroup[];
  now: number;
  onEdit: (note: Note) => void;
  onKeep: (note: Note) => void;
  onDelete: (id: string) => void;
}

const LEAVE_MS = 240;

/**
 * The capture stream: a chat with yourself. Newest at the bottom, day
 * headers in between, the input docked below.
 */
export default function StreamScreen({
  groups,
  now,
  onEdit,
  onKeep,
  onDelete,
}: Props) {
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);
  const count = groups.reduce((sum, g) => sum + g.notes.length, 0);
  const prevCount = useRef(count);

  // Note ids rendered at least once — new ids after mount animate in.
  const seenRef = useRef<Set<string> | null>(null);
  if (seenRef.current === null) {
    seenRef.current = new Set(groups.flatMap((g) => g.notes.map((n) => n.id)));
  }
  const seen = seenRef.current;

  useEffect(() => {
    for (const g of groups) for (const n of g.notes) seen.add(n.id);
  }, [groups, seen]);

  // Open at the bottom (the present); follow new jots down.
  useEffect(() => {
    const grew = count > prevCount.current;
    prevCount.current = count;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    endRef.current?.scrollIntoView({
      behavior: grew && !reduce ? "smooth" : "auto",
      block: "end",
    });
  }, [count]);

  const remove = (id: string) => {
    setLeaving((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      onDelete(id);
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, LEAVE_MS);
  };

  return (
    <div className="screen stream">
      {count === 0 ? (
        <div className="stream-empty">
          <svg
            className="empty-icon"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14 34c8-2 20-14 24-22M14 34l-3 8 8-3M14 34l5 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
            />
          </svg>
          <p className="empty-title">Whatever's in your head, put it here.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.day}>
            <h2 className="day-header">{formatDayLabel(group.day)}</h2>
            {group.notes.map((note) => {
              const isNew = !seen.has(note.id);
              const isLeaving = leaving.has(note.id);
              return (
                <div
                  key={note.id}
                  className={`jot-shell${isLeaving ? " leaving" : ""}${
                    isNew ? " entering" : ""
                  }`}
                >
                  <div className="jot-clip">
                    <div className="jot-row">
                      <button
                        className="jot-bubble"
                        onClick={() => onEdit(note)}
                        aria-label={`Edit jot: ${note.text}`}
                      >
                        <span className="jot-text">{note.text}</span>
                        <span className="jot-meta">
                          {formatTime(note.createdAt)}
                          {note.expiresAt !== null && (
                            <span
                              className="jot-expiry"
                              title="Disappearing jot"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4 1.5h8M4 14.5h8M4.5 1.5v2.2c0 1.9 3.5 3.1 3.5 4.3s-3.5 2.4-3.5 4.3v2.2M11.5 1.5v2.2c0 1.9-3.5 3.1-3.5 4.3s3.5 2.4 3.5 4.3v2.2"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {remainingLabel(note.expiresAt, now)}
                            </span>
                          )}
                        </span>
                      </button>
                      <div className="jot-actions">
                        <button
                          className="jot-keep"
                          onClick={() => onKeep(note)}
                          aria-label={`Keep jot: ${note.text}`}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 2.5h8a.5.5 0 01.5.5v10.6a.3.3 0 01-.47.24L8 11l-4.03 2.84a.3.3 0 01-.47-.24V3a.5.5 0 01.5-.5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="jot-delete"
                          onClick={() => remove(note.id)}
                          aria-label={`Delete jot: ${note.text}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M3 3l8 8M11 3l-8 8"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}
      <div id="stream-end" ref={endRef} aria-hidden="true" />
    </div>
  );
}
