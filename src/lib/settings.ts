import { mirrorWrite } from "./mirror";

/**
 * User preferences, stored separately from notes so either can evolve
 * independently. Versioned like the notes store.
 */
const SETTINGS_KEY = "jot.settings";
const SETTINGS_VERSION = 1;

export type ThemePref = "system" | "light" | "dark";
export type Accent = "azure" | "emerald" | "blush";

export const ACCENTS: Accent[] = ["azure", "emerald", "blush"];

export function isAccent(value: unknown): value is Accent {
  return value === "azure" || value === "emerald" || value === "blush";
}

export interface Settings {
  /** Appearance override; "system" follows the OS. */
  theme: ThemePref;
  /** Accent token family, stamped as data-accent on <html>. */
  accent: Accent;
  /**
   * Focus the capture input on app open so the keyboard is already rising
   * while the app paints. Capture is the point of the app, so default ON.
   */
  keyboardReady: boolean;
}

const DEFAULTS: Settings = {
  theme: "system",
  accent: "azure",
  keyboardReady: true,
};

interface SettingsShape {
  version: number;
  settings: Partial<Settings>;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as SettingsShape;
    const s = parsed?.settings ?? {};
    return {
      theme: s.theme === "light" || s.theme === "dark" ? s.theme : "system",
      accent: isAccent(s.accent) ? s.accent : "azure",
      keyboardReady:
        typeof s.keyboardReady === "boolean" ? s.keyboardReady : true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    const payload: SettingsShape = { version: SETTINGS_VERSION, settings };
    const json = JSON.stringify(payload);
    localStorage.setItem(SETTINGS_KEY, json);
    mirrorWrite(SETTINGS_KEY, json);
  } catch {
    // Storage unavailable — settings just won't persist.
  }
}
