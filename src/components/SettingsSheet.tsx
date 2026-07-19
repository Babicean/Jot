import { useRef } from "react";
import Sheet from "./Sheet";
import { ACCENTS, type Accent, type Settings } from "../lib/settings";
import type { ThemePref } from "../lib/theme";
import type { Note } from "../types";
import {
  backupFilename,
  buildBackup,
  parseBackup,
  type BackupPayload,
  type MergeResult,
} from "../lib/backup";
import { shareBackupFile } from "../lib/exportFile";
import { Capacitor } from "@capacitor/core";

interface Props {
  open: boolean;
  settings: Settings;
  notes: Note[];
  onSetTheme: (theme: ThemePref) => void;
  onSetAccent: (accent: Accent) => void;
  onSetKeyboardReady: (on: boolean) => void;
  onImport: (backup: BackupPayload) => MergeResult;
  onNotify: (message: string) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { id: ThemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const ACCENT_NAMES: Record<Accent, string> = {
  azure: "Azure",
  emerald: "Emerald",
  blush: "Blush",
};

export default function SettingsSheet({
  open,
  settings,
  notes,
  onSetTheme,
  onSetAccent,
  onSetKeyboardReady,
  onImport,
  onNotify,
  onClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    const payload = buildBackup(notes, settings);
    try {
      await shareBackupFile(
        backupFilename(),
        JSON.stringify(payload, null, 2),
      );
      // On Android the share sheet is its own confirmation.
      if (!Capacitor.isNativePlatform()) onNotify("backup saved");
    } catch {
      // Share sheet dismissed — not an error worth reporting.
    }
  };

  const importFile = async (file: File) => {
    const backup = parseBackup(await file.text());
    if (!backup) {
      onNotify("couldn't read that file");
      return;
    }
    onImport(backup);
    onNotify("backup imported");
  };

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <p className="settings-label">Appearance</p>
      <div className="seg" role="radiogroup" aria-label="Appearance">
        {THEME_OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={settings.theme === o.id}
            className={`seg-btn${settings.theme === o.id ? " active" : ""}`}
            onClick={() => onSetTheme(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="settings-label">Accent</p>
      <div className="accent-row" role="radiogroup" aria-label="Accent">
        {ACCENTS.map((a) => (
          <button
            key={a}
            role="radio"
            aria-checked={settings.accent === a}
            className={`accent-btn accent-${a}${
              settings.accent === a ? " active" : ""
            }`}
            onClick={() => onSetAccent(a)}
          >
            <span className="accent-dot" aria-hidden="true" />
            {ACCENT_NAMES[a]}
          </button>
        ))}
      </div>

      <p className="settings-label">Capture</p>
      <div className="settings-row">
        <div className="settings-row-text">
          <span className="settings-row-title">Keyboard ready on open</span>
          <span className="settings-row-sub">
            start with the keyboard up, ready to type
          </span>
        </div>
        <button
          className={`switch${settings.keyboardReady ? " on" : ""}`}
          role="switch"
          aria-checked={settings.keyboardReady}
          aria-label="Keyboard ready on open"
          onClick={() => onSetKeyboardReady(!settings.keyboardReady)}
        >
          <span className="switch-knob" />
        </button>
      </div>

      <p className="settings-label">Your data</p>
      <div className="data-card">
        <p className="data-sub">one file with every note in it</p>
        <div className="data-actions">
          <button className="data-btn primary" onClick={exportBackup}>
            Export backup
          </button>
          <button className="data-btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <p className="settings-foot">
        Jot v{__APP_VERSION__} · your notes stay on this device.
      </p>
    </Sheet>
  );
}
