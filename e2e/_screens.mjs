// Release screenshots: every screen, light and dark, phone viewport.
import { chromium } from "playwright";

const OUT = "/tmp/claude-0/-home-user/6ced9ede-b9c6-5119-9940-7ad8de7ece78/scratchpad/screens";
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const seed = () => {
  if (localStorage.getItem("jot.settings")) return;
  const now = Date.now();
  const H = 3600_000;
  const day = (t) => {
    const d = new Date(t);
    if (d.getHours() < 2) d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const mk = (over) => ({
    id: crypto.randomUUID(), text: "", title: "", createdAt: now, updatedAt: now,
    day: day(now), shelf: "stream", expiresAt: null, pinned: false, checklist: false, ticked: [], ...over,
  });
  const notes = [
    mk({ text: "call the notary about the apartment papers", createdAt: now - 26 * H, updatedAt: now - 26 * H, day: day(now - 26 * H) }),
    mk({ text: "that bakery on Arthur street, try the pistachio thing", createdAt: now - 25 * H, updatedAt: now - 25 * H, day: day(now - 25 * H) }),
    mk({ text: "parked on level 3, row F", createdAt: now - 2 * H, updatedAt: now - 2 * H, day: day(now - 2 * H), expiresAt: now + 22 * H }),
    mk({ text: "app idea: a timer that guilt trips you gently", createdAt: now - H, updatedAt: now - H, day: day(now - H) }),
    mk({ text: "buy milk and coffee filters", createdAt: now - 20 * 60000, updatedAt: now - 20 * 60000, day: day(now) }),
    mk({ shelf: "notes", title: "Balcony plan", text: "shelf on the left wall\nherbs in boxes: basil, mint\nsmall table from the garage", updatedAt: now - 5 * H }),
    mk({ shelf: "ideas", text: "an album of only voice memos", pinned: true, updatedAt: now - 8 * H }),
    mk({ shelf: "ideas", text: "cook through one cookbook, in order", updatedAt: now - 50 * H }),
    mk({ shelf: "people", title: "Ana", text: "loves tulips, not roses\nbirthday June 12\nwants to try the pistachio bakery", updatedAt: now - 30 * H }),
    mk({ shelf: "people", title: "Mira", text: "asked about the plant book", updatedAt: now - 60 * H }),
  ];
  localStorage.setItem("jot.notes", JSON.stringify({ version: 1, notes }));
  localStorage.setItem("jot.settings", JSON.stringify({
    version: 1, settings: { theme: "system", accent: window.__accent ?? "azure", keyboardReady: false },
  }));
};

async function capture(scheme, accent, suffix) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true, colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.addInitScript(`window.__accent = ${JSON.stringify(accent)};`);
  await page.addInitScript(seed);
  await page.goto("http://localhost:4173/");
  await page.waitForSelector(".jot-bubble");
  await page.waitForTimeout(600);

  await page.screenshot({ path: `${OUT}/stream-${suffix}.png` });

  // Jot edit sheet
  await page.locator(".jot-bubble", { hasText: "parked on level 3" }).click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/edit-jot-${suffix}.png` });
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(350);

  // Keep sheet
  await page.getByRole("button", { name: /Keep jot: buy milk/ }).click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/keep-${suffix}.png` });
  await page.getByRole("button", { name: /People/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/keep-people-${suffix}.png` });
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(350);

  // Library
  await page.getByRole("button", { name: "Library" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/library-${suffix}.png` });

  // Note editor
  await page.locator(".lib-main", { hasText: "Ana" }).click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/note-editor-${suffix}.png` });
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(350);

  // Settings
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/settings-${suffix}.png` });

  await ctx.close();
}

// Empty stream, light, keyboard cue visible
{
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true, colorScheme: "light",
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    if (localStorage.getItem("jot.settings")) return;
    localStorage.setItem("jot.notes", JSON.stringify({ version: 1, notes: [] }));
    localStorage.setItem("jot.settings", JSON.stringify({ version: 1, settings: { theme: "system", accent: "azure", keyboardReady: false } }));
  });
  await page.goto("http://localhost:4173/");
  await page.waitForSelector(".stream-empty");
  await page.screenshot({ path: `${OUT}/stream-empty-light.png` });
  await ctx.close();
}

await capture("light", "azure", "light");
await capture("dark", "azure", "dark");

// Accent proof: one stream shot per remaining accent, light + dark split
{
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true, colorScheme: "light",
  });
  const page = await ctx.newPage();
  await page.addInitScript(`window.__accent = "emerald";`);
  await page.addInitScript(seed);
  await page.goto("http://localhost:4173/");
  await page.waitForSelector(".jot-bubble");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/settings-emerald-light.png` });
  await ctx.close();
}
{
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true, colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.addInitScript(`window.__accent = "blush";`);
  await page.addInitScript(seed);
  await page.goto("http://localhost:4173/");
  await page.waitForSelector(".jot-bubble");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/settings-blush-dark.png` });
  await ctx.close();
}

await browser.close();
console.log("done");
