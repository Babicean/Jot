import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DayKey, LibraryShelf, Note } from "../types";
import { msUntilNextBoundary, trackingDayFor } from "../lib/day";
import {
  appendedText,
  createJot,
  createLibraryNote,
  findPerson,
  groupStream,
  loadNotes,
  peopleNames,
  saveNotes,
  sweepExpired,
  type ExpiryChoice,
} from "../lib/notes";
import {
  loadSettings,
  saveSettings,
  type Accent,
  type Settings,
} from "../lib/settings";
import { mergeBackup, type BackupPayload } from "../lib/backup";
import { applyAccent, applyTheme, type ThemePref } from "../lib/theme";

/** How often the app re-checks disappearing jots while open. */
const SWEEP_INTERVAL_MS = 30_000;

/** Everything a keep can undo: restore the jot, revert what it landed on. */
export interface KeepResult {
  /** Toast label target: shelf name or the person's name. */
  label: string;
  undo: () => void;
}

/**
 * Single source of truth for notes and settings. Loads everything at boot,
 * persists on change (guarded by a booted ref so a lossy load is never
 * written back over the mirror), sweeps expired jots, rolls the tracking
 * day over at 2 AM, and syncs across tabs.
 */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [today, setToday] = useState<DayKey>(() => trackingDayFor(new Date()));
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  /** A minute-ish clock for countdown cues; also drives the sweep. */
  const [now, setNow] = useState(() => Date.now());
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      return;
    }
    saveNotes(notes);
  }, [notes]);

  const sweep = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setNotes((prev) => {
      const result = sweepExpired(prev, at);
      return result.removed > 0 ? result.notes : prev;
    });
  }, []);

  // Cleanup at boot, on a timer while open, and when the app comes back
  // to the foreground — the same pattern as the 2 AM rollover.
  useEffect(() => {
    sweep();
    const interval = window.setInterval(sweep, SWEEP_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) {
        sweep();
        setToday(trackingDayFor(new Date()));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sweep]);

  // Re-evaluate "today" exactly when the next 2 AM boundary passes.
  useEffect(() => {
    const timer = setTimeout(
      () => setToday(trackingDayFor(new Date())),
      msUntilNextBoundary(new Date()) + 1000,
    );
    return () => clearTimeout(timer);
  }, [today]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "jot.notes") setNotes(loadNotes());
      if (event.key === "jot.settings") {
        const next = loadSettings();
        setSettings(next);
        applyTheme(next.theme);
        applyAccent(next.accent);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      if (patch.theme !== undefined) applyTheme(next.theme);
      if (patch.accent !== undefined) applyAccent(next.accent);
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: ThemePref) => updateSettings({ theme }),
    [updateSettings],
  );
  const setAccent = useCallback(
    (accent: Accent) => updateSettings({ accent }),
    [updateSettings],
  );
  const setKeyboardReady = useCallback(
    (keyboardReady: boolean) => updateSettings({ keyboardReady }),
    [updateSettings],
  );

  /** Capture: the whole point of the app. */
  const addJot = useCallback((text: string, expiry: ExpiryChoice): Note => {
    const jot = createJot(text, expiry);
    setNotes((prev) => [...prev, jot]);
    return jot;
  }, []);

  /** "+ New note" straight onto a Library shelf. */
  const addNote = useCallback(
    (shelf: LibraryShelf, title: string, text: string, pinned = false): Note => {
      const note = { ...createLibraryNote(shelf, title, text), pinned };
      setNotes((prev) => [...prev, note]);
      return note;
    },
    [],
  );

  /** Edit fields on any note; every edit stamps updatedAt for merge order. */
  const updateNote = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<Note, "text" | "title" | "shelf" | "expiresAt" | "pinned">
      >,
    ) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
        ),
      );
    },
    [],
  );

  // Pin is metadata, not an edit: leaving updatedAt alone keeps a note's
  // place in the date order when it's unpinned (Tally's pin grammar).
  const togglePinned = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    );
  }, []);

  /** Delete a note, returning it so the caller can offer undo. */
  const deleteNote = useCallback(
    (id: string): Note | null => {
      const note = notes.find((n) => n.id === id) ?? null;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return note;
    },
    [notes],
  );

  /** Put a previously deleted note back exactly as it was. */
  const restoreNote = useCallback((note: Note) => {
    setNotes((prev) =>
      prev.some((n) => n.id === note.id) ? prev : [...prev, note],
    );
  }, []);

  /**
   * Keep a jot: promote it off the stream. Notes/Ideas move the record and
   * clear its timer (kept notes never expire). People appends the jot text
   * to the person's page — creating the page if needed — and retires the jot.
   */
  const keepJot = useCallback(
    (
      id: string,
      shelf: LibraryShelf,
      personName = "",
      textOverride?: string,
    ): KeepResult | null => {
      const found = notes.find((n) => n.id === id);
      if (!found || found.shelf !== "stream") return null;
      const at = Date.now();
      // The edit sheet keeps in the same tap as a text edit; carry it along.
      const jot =
        textOverride !== undefined ? { ...found, text: textOverride } : found;

      if (shelf !== "people") {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, text: jot.text, shelf, expiresAt: null, updatedAt: at }
              : n,
          ),
        );
        return {
          label: shelf === "notes" ? "Notes" : "Ideas",
          undo: () =>
            setNotes((prev) =>
              prev.map((n) => (n.id === id ? { ...jot } : n)),
            ),
        };
      }

      const name = personName.trim();
      if (name === "") return null;
      const person = findPerson(notes, name);

      if (person) {
        const prevText = person.text;
        const prevUpdatedAt = person.updatedAt;
        setNotes((prev) =>
          prev
            .filter((n) => n.id !== id)
            .map((n) =>
              n.id === person.id
                ? { ...n, text: appendedText(n.text, jot.text), updatedAt: at }
                : n,
            ),
        );
        return {
          label: person.title,
          undo: () =>
            setNotes((prev) => [
              ...prev.map((n) =>
                n.id === person.id
                  ? { ...n, text: prevText, updatedAt: prevUpdatedAt }
                  : n,
              ),
              { ...jot },
            ]),
        };
      }

      const page = createLibraryNote("people", name, jot.text);
      setNotes((prev) => [...prev.filter((n) => n.id !== id), page]);
      return {
        label: page.title,
        undo: () =>
          setNotes((prev) => [
            ...prev.filter((n) => n.id !== page.id),
            { ...jot },
          ]),
      };
    },
    [notes],
  );

  /** Merge an imported backup (union by id) and report what changed. */
  const importBackup = useCallback(
    (backup: BackupPayload) => {
      const result = mergeBackup(notes, backup);
      setNotes(result.notes);
      return result;
    },
    [notes],
  );

  const stream = useMemo(() => groupStream(notes), [notes]);
  const people = useMemo(() => peopleNames(notes), [notes]);

  return {
    notes,
    stream,
    people,
    today,
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
  };
}
