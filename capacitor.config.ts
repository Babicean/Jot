import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.babicean.jot",
  appName: "Jot",
  webDir: "dist",
  android: {
    // The web app handles its own safe areas; keep the system bars styled
    // by the theme rather than overlaying the webview.
    backgroundColor: "#f5f6f8",
  },
};

export default config;
