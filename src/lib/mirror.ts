import { Preferences } from "@capacitor/preferences";

/**
 * Durability layer. localStorage stays the synchronous source of truth the
 * UI reads at startup, but every write is mirrored to Capacitor Preferences
 * (SharedPreferences on Android). Two things that makes survivable:
 *
 *  - Android occasionally clears WebView storage (updates, corruption);
 *    native preferences are untouched, and we restore from them on launch.
 *  - Android's auto-backup includes SharedPreferences (WebView data is
 *    excluded), so reinstalls and phone transfers recover data too.
 *
 * On the plain web build Preferences falls back to a localStorage shim,
 * which makes the mirror a harmless no-op copy.
 *
 * Every new persistent key MUST be added here and to the backup format.
 */

export const MIRRORED_KEYS = ["jot.notes", "jot.settings"] as const;

/** Fire-and-forget mirror write; storage failures must never break the UI. */
export function mirrorWrite(key: string, value: string): void {
  Preferences.set({ key, value }).catch(() => {});
}

export function mirrorRemove(key: string): void {
  Preferences.remove({ key }).catch(() => {});
}

/** True when a stored value is present and parses as JSON. */
function usable(raw: string | null): boolean {
  if (raw === null) return false;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Called once before the app renders. For any key missing from localStorage
 * OR unparsable (corrupt), restore the native mirror's copy — this is the
 * "WebView data was wiped" recovery path.
 */
export async function restoreFromMirror(): Promise<void> {
  try {
    await Promise.all(
      MIRRORED_KEYS.map(async (key) => {
        if (usable(localStorage.getItem(key))) return;
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      }),
    );
  } catch {
    // Recovery is best-effort; the app still works from localStorage.
  }
}
