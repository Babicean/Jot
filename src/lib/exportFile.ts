import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Hand a backup file to the user: the system share sheet on Android
 * (save to Files, Drive, message it to yourself — their choice), a plain
 * download in the browser.
 */
export async function shareBackupFile(
  filename: string,
  json: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Jot backup",
      url: file.uri,
      dialogTitle: "Save your Jot backup",
    });
  } else {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
