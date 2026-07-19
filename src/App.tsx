import { useEffect, useRef, useState } from "react";
import type { LibraryShelf, Note } from "../src/types";
import { useNotes } from "./hooks/useNotes";
import { useToast } from "./hooks/useToast";
import type { LibraryFilter } from "./lib/notes";
import StreamScreen from "./components/StreamScreen";
import CaptureBar, { type CaptureBarHandle } from "./components/CaptureBar";
import LibraryScreen from "./components/LibraryScreen";
import JotSheet from "./components/JotSheet";
import KeepSheet from "./components/KeepSheet";
import NoteSheet, { type NoteSheetMode } from "./components/NoteSheet";
import SettingsSheet from "./components/SettingsSheet";
import Toast from "./components/Toast";

type Tab = "jot" | "library";

const UNDO_MS = 5000;

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "jot",
    label: "Jot",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 12.5c4-1 8.5-5.5 10-9.5M3 12.5l-1 2.5 2.5-1M3 12.5l1.5 1.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M4.5 2.5h7a1 1 0 011 1v9.4a.3.3 0 01-.46.25L8 10.8l-4.04 2.35a.3.3 0 01-.46-.25V3.5a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("jot");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gearSpin, setGearSpin] = useState(false);
  const [editingJot, setEditingJot] = useState<Note | null>(null);
  const [keepingJot, setKeepingJot] = useState<Note | null>(null);
  const [noteMode, setNoteMode] = useState<NoteSheetMode>(null);
  const captureRef = useRef<CaptureBarHandle>(null);

  const {
    notes,
    stream,
    people,
    now,
    settings,
    setTheme,
    setAccent,
    setKeyboardReady,
    addJot,
    addNote,
    updateNote,
    togglePinned,
    deleteNote,
    restoreNote,
    keepJot,
    importBackup,
  } = useNotes();

  const { toast, showToast, dismiss, pause, resume } = useToast();

  // Keyboard ready on open: the keyboard is rising while the app paints.
  useEffect(() => {
    if (settings.keyboardReady) captureRef.current?.focus();
    // Run once at boot on purpose; toggling the setting shouldn't refocus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeWithUndo = (id: string) => {
    const deleted = deleteNote(id);
    if (!deleted) return;
    showToast(
      {
        kind: "undo",
        message: deleted.shelf === "stream" ? "jot deleted" : "note deleted",
        action: {
          label: "Undo",
          onPress: () => {
            restoreNote(deleted);
            dismiss();
          },
        },
      },
      UNDO_MS,
    );
  };

  const keep = (shelf: LibraryShelf, personName?: string) => {
    if (!keepingJot) return;
    const result = keepJot(keepingJot.id, shelf, personName);
    setKeepingJot(null);
    if (!result) return;
    showToast(
      {
        kind: "undo",
        message:
          shelf === "people"
            ? `added to ${result.label}`
            : `kept to ${result.label}`,
        action: {
          label: "Undo",
          onPress: () => {
            result.undo();
            dismiss();
          },
        },
      },
      UNDO_MS,
    );
  };

  return (
    <div className={`app${tab === "jot" ? " app-stream" : ""}`}>
      <div className="top-bar">
        <span className="wordmark">Jot</span>
        <button
          className={`settings-btn${gearSpin ? " spinning" : ""}`}
          onClick={() => {
            setGearSpin(true);
            setSettingsOpen(true);
          }}
          onAnimationEnd={() => setGearSpin(false)}
          aria-label="Settings"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <nav className="tabs-wrap" aria-label="Screens">
        <div className="tabbar tabbar-2">
          <span
            className="tab-indicator"
            style={{
              transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)`,
            }}
            aria-hidden="true"
          />
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "jot" && (
        <>
          <StreamScreen
            groups={stream}
            now={now}
            onEdit={setEditingJot}
            onKeep={setKeepingJot}
            onDelete={removeWithUndo}
          />
          <CaptureBar ref={captureRef} onSend={addJot} />
        </>
      )}
      {tab === "library" && (
        <LibraryScreen
          notes={notes}
          filter={filter}
          onSetFilter={setFilter}
          onOpen={(note) => setNoteMode({ kind: "edit", note })}
          onNew={() =>
            setNoteMode({
              kind: "new",
              shelf: filter === "all" ? "notes" : filter,
            })
          }
          onTogglePinned={togglePinned}
        />
      )}

      <JotSheet
        note={editingJot}
        onSave={(id, text, expiresAt) =>
          updateNote(
            id,
            expiresAt === undefined ? { text } : { text, expiresAt },
          )
        }
        onDelete={removeWithUndo}
        onClose={() => setEditingJot(null)}
      />

      <KeepSheet
        note={keepingJot}
        people={people}
        onKeep={keep}
        onClose={() => setKeepingJot(null)}
      />

      <NoteSheet
        mode={noteMode}
        onSave={(id, patch) => updateNote(id, patch)}
        onCreate={(shelf, title, text, pinned) =>
          addNote(shelf, title, text, pinned)
        }
        onDelete={removeWithUndo}
        onClose={() => setNoteMode(null)}
      />

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        notes={notes}
        onSetTheme={setTheme}
        onSetAccent={setAccent}
        onSetKeyboardReady={setKeyboardReady}
        onImport={importBackup}
        onNotify={(message) => showToast({ kind: "confirm", message }, 2600)}
        onClose={() => setSettingsOpen(false)}
      />

      <Toast toast={toast} onHold={pause} onRelease={resume} />
    </div>
  );
}
