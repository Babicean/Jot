import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * Text shared into Jot from other apps, plus the "new jot" launcher
 * shortcut. Two roads in:
 *  - Android: the tiny native ShareTarget plugin (ACTION_SEND / shortcut).
 *  - PWA: the manifest share_target lands the text in the query string.
 * Either way the capture bar gets prefilled — the user still hits send.
 */

interface PendingShare {
  text: string;
  newJot: boolean;
}

interface ShareTargetNative {
  getPendingShare(): Promise<PendingShare>;
  addListener(
    eventName: "shareReceived",
    listener: (share: PendingShare) => void,
  ): Promise<PluginListenerHandle>;
}

const ShareTarget = registerPlugin<ShareTargetNative>("ShareTarget");

/** Pull share text (or a bare focus request) out of a PWA launch URL. */
export function shareFromQuery(search: string): string | null {
  const params = new URLSearchParams(search);
  const parts = [params.get("title"), params.get("text"), params.get("url")]
    .map((p) => p?.trim() ?? "")
    .filter((p) => p !== "");
  if (parts.length === 0) return null;
  // The page title is noise when there's anything else to go on.
  if (parts.length > 1 && params.get("title")) parts.shift();
  return parts.join(" ");
}

/**
 * Watch every way a share can arrive. `onShare` gets the text to prefill;
 * `onNewJot` means "just get me typing" (the shortcut).
 */
export function watchIncomingShares(
  onShare: (text: string) => void,
  onNewJot: () => void,
): () => void {
  // PWA launch with share_target params.
  const fromQuery = shareFromQuery(window.location.search);
  if (fromQuery !== null) {
    window.history.replaceState(null, "", window.location.pathname);
    onShare(fromQuery);
  }

  if (!Capacitor.isNativePlatform()) return () => {};

  const deliver = (share: PendingShare) => {
    if (share.text !== "") onShare(share.text);
    else if (share.newJot) onNewJot();
  };

  // Cold start: the launch intent is waiting for us.
  ShareTarget.getPendingShare().then(deliver).catch(() => {});
  // Warm start: shares arriving while the app is open.
  const handle = ShareTarget.addListener("shareReceived", deliver);
  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}
