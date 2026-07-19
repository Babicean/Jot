/*
 * Jot E2E suite — drives the BUILT app (vite preview on :4173) with the
 * preinstalled chromium at a phone viewport. Run: npm run build && npm run e2e
 * (with `npx vite preview --port 4173 --strictPort` running).
 *
 * Covers: capture, edit, delete + undo, expiry sweep + timer cues, keep to
 * every shelf (with People append + create), pinning, themes + accents,
 * export/import round trip, keyboard-ready toggle.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:4173/";
const EXE = "/opt/pw-browsers/chromium";

let browser;
let passed = 0;
const failures = [];

function note(over = {}) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    text: "",
    title: "",
    createdAt: now,
    updatedAt: now,
    day: "2026-01-01",
    shelf: "stream",
    expiresAt: null,
    pinned: false,
    checklist: false,
    ticked: [],
    ...over,
  };
}

/** Day key the app would assign "now" (2 AM boundary). */
function todayKey(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  if (d.getHours() < 2) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function freshPage(seedNotes = [], settings = null, ctxOpts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    ...ctxOpts,
  });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([notes, settings]) => {
      // Guard: reloads must not re-seed over app writes.
      if (localStorage.getItem("jot.settings")) return;
      localStorage.setItem("jot.notes", JSON.stringify({ version: 1, notes }));
      localStorage.setItem(
        "jot.settings",
        JSON.stringify({
          version: 1,
          settings: settings ?? {
            theme: "light",
            accent: "azure",
            keyboardReady: false,
          },
        }),
      );
    },
    [seedNotes, settings],
  );
  await page.goto(BASE);
  await page.waitForSelector(".wordmark");
  return { ctx, page };
}

async function scenario(name, fn) {
  process.stdout.write(`  ${name} … `);
  try {
    await fn();
    passed += 1;
    console.log("ok");
  } catch (err) {
    failures.push({ name, err });
    console.log(`FAIL\n    ${String(err).split("\n")[0]}`);
  }
}

function expect(cond, message) {
  if (!cond) throw new Error(message);
}

browser = await chromium.launch({ executablePath: EXE });

// ---------------------------------------------------------------- capture
await scenario("capture: type, send, lands in stream under Today", async () => {
  const { ctx, page } = await freshPage();
  await expectText(page, ".stream-empty", /whatever's in your head/i);
  await page.getByLabel("Jot something").fill("first thought");
  await page.getByRole("button", { name: "Send jot" }).click();
  await page.waitForSelector(".jot-bubble");
  await expectText(page, ".jot-text", /first thought/);
  await expectText(page, ".day-header", /today/i);
  // Persisted: survives a reload.
  await page.reload();
  await page.waitForSelector(".jot-bubble");
  await expectText(page, ".jot-text", /first thought/);
  await ctx.close();
});

async function expectText(page, selector, re, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  let texts = [];
  for (;;) {
    texts = await page.locator(selector).allInnerTexts();
    if (texts.some((t) => re.test(t))) return;
    if (Date.now() > deadline) break;
    await page.waitForTimeout(100);
  }
  expect(false, `expected ${selector} to match ${re}, got: ${JSON.stringify(texts)}`);
}

// ------------------------------------------------------------------- edit
await scenario("edit: tap a jot, change its text in the sheet", async () => {
  const seed = [note({ text: "old words", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.locator(".jot-bubble").click();
  const sheet = page.getByRole("dialog", { name: "Edit jot" });
  await sheet.getByLabel("Jot text").fill("new words entirely");
  await sheet.getByRole("button", { name: "Done" }).click();
  await expectText(page, ".jot-text", /new words entirely/);
  await page.reload();
  await page.waitForSelector(".jot-bubble");
  await expectText(page, ".jot-text", /new words entirely/);
  await ctx.close();
});

// ---------------------------------------------------------- delete + undo
await scenario("delete + undo: the jot comes back", async () => {
  const seed = [note({ text: "doomed thought", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: /Delete jot: doomed/ }).click();
  await page.waitForSelector(".toast");
  await expectText(page, ".toast", /jot deleted/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expectText(page, ".jot-text", /doomed thought/);
  // And without undo it stays gone.
  await page.getByRole("button", { name: /Delete jot: doomed/ }).click();
  await page.waitForTimeout(400);
  expect(
    (await page.locator(".jot-bubble").count()) === 0,
    "jot should be gone after delete",
  );
  await page.reload();
  await page.waitForSelector(".stream-empty");
  await ctx.close();
});

// ------------------------------------------------------------ expiry sweep
await scenario("expiry: expired jots vanish at boot, live ones show cues", async () => {
  const seed = [
    note({ text: "already gone", day: todayKey(), expiresAt: Date.now() - 1000 }),
    note({
      text: "parked on level 3",
      day: todayKey(),
      expiresAt: Date.now() + 22 * 3600_000,
    }),
  ];
  const { ctx, page } = await freshPage(seed);
  await page.waitForSelector(".jot-bubble");
  const texts = await page.locator(".jot-text").allInnerTexts();
  expect(!texts.some((t) => /already gone/.test(t)), "expired jot leaked");
  expect(texts.some((t) => /parked/.test(t)), "live jot missing");
  await expectText(page, ".jot-expiry", /22h/);
  await ctx.close();
});

await scenario("expiry: capture-bar timer cycles and stamps new jots", async () => {
  const { ctx, page } = await freshPage();
  const timer = page.locator(".timer-btn");
  await timer.click(); // off -> 24h
  await expectText(page, ".timer-label", /24h/);
  await page.getByLabel("Jot something").fill("milk today");
  await page.getByRole("button", { name: "Send jot" }).click();
  await page.waitForSelector(".jot-expiry");
  await expectText(page, ".jot-expiry", /24h/);
  // Timer resets to off after sending.
  expect(
    (await page.locator(".timer-label").count()) === 0,
    "timer should reset after send",
  );
  await ctx.close();
});

await scenario("expiry: add and remove a timer from the edit sheet", async () => {
  const seed = [note({ text: "give me a timer", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.locator(".jot-bubble").click();
  const sheet = page.getByRole("dialog", { name: "Edit jot" });
  await sheet.getByRole("radio", { name: "48h" }).click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await page.waitForSelector(".jot-expiry");
  await expectText(page, ".jot-expiry", /48h/);
  await page.locator(".jot-bubble").click();
  await sheet.getByRole("radio", { name: "Off" }).click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(300);
  expect(
    (await page.locator(".jot-expiry").count()) === 0,
    "timer should be removed",
  );
  await ctx.close();
});

// ---------------------------------------------------------- keep to shelves
await scenario("keep to Notes: moves off the stream, undo restores", async () => {
  const seed = [note({ text: "keep me around", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: /Keep jot: keep me/ }).click();
  await page.getByRole("button", { name: /Notes/ }).click();
  await expectText(page, ".toast", /kept to Notes/);
  expect((await page.locator(".jot-bubble").count()) === 0, "jot still in stream");
  // Undo brings it back to the stream.
  await page.getByRole("button", { name: "Undo" }).click();
  await expectText(page, ".jot-text", /keep me around/);
  // Keep again, this time let it stand; verify it's in the Library.
  await page.getByRole("button", { name: /Keep jot: keep me/ }).click();
  await page.getByRole("button", { name: /Notes/ }).click();
  await page.getByRole("button", { name: "Library" }).click();
  await expectText(page, ".lib-name", /keep me around/);
  await page.reload();
  await page.getByRole("button", { name: "Library" }).click();
  await expectText(page, ".lib-name", /keep me around/);
  await ctx.close();
});

await scenario("keep to Ideas: lands on the Ideas shelf", async () => {
  const seed = [note({ text: "wild idea", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: /Keep jot: wild/ }).click();
  await page.getByRole("button", { name: /Ideas/ }).click();
  await expectText(page, ".toast", /kept to Ideas/);
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("radio", { name: "Ideas" }).click();
  await expectText(page, ".lib-name", /wild idea/);
  await ctx.close();
});

await scenario("keep to People: creates the person's page", async () => {
  const seed = [note({ text: "mira wants that plant book", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: /Keep jot: mira/ }).click();
  await page.getByRole("button", { name: /People/ }).click();
  await page.getByPlaceholder("name").fill("Mira");
  await page.getByRole("button", { name: "Keep", exact: true }).click();
  await expectText(page, ".toast", /added to Mira/);
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("radio", { name: "People" }).click();
  await expectText(page, ".lib-name", /Mira/);
  await ctx.close();
});

await scenario("keep to People: appends to an existing page, undo reverts", async () => {
  const seed = [
    note({
      shelf: "people",
      title: "Ana",
      text: "loves tulips",
      day: todayKey(),
    }),
    note({ text: "ana's birthday is in June", day: todayKey() }),
  ];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: /Keep jot: ana's birthday/ }).click();
  await page.getByRole("button", { name: /People/ }).click();
  // Existing names surface as one-tap chips.
  await page.locator(".people-suggest .chip", { hasText: "Ana" }).click();
  await page.getByRole("button", { name: "Keep", exact: true }).click();
  await expectText(page, ".toast", /added to Ana/);
  // The page accumulated the jot text.
  await page.getByRole("button", { name: "Library" }).click();
  await page.locator(".lib-main", { hasText: "Ana" }).click();
  const body = await page.getByLabel("Note text").inputValue();
  expect(
    body === "loves tulips\n\nana's birthday is in June",
    `unexpected People page body: ${JSON.stringify(body)}`,
  );
  await page.getByRole("button", { name: "Close" }).click();
  // Undo restores both the jot and the previous page text.
  await page.getByRole("button", { name: "Undo" }).click();
  await page.locator(".lib-main", { hasText: "Ana" }).click();
  const reverted = await page.getByLabel("Note text").inputValue();
  expect(reverted === "loves tulips", "undo should revert the append");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Jot", exact: true }).click();
  await expectText(page, ".jot-text", /ana's birthday/);
  await ctx.close();
});

// ------------------------------------------------- keep from the edit sheet
await scenario("keep from edit sheet: files to Notes with text edits kept", async () => {
  const seed = [note({ text: "rough thought", day: todayKey() })];
  const { ctx, page } = await freshPage(seed);
  await page.locator(".jot-bubble").click();
  const sheet = page.getByRole("dialog", { name: "Edit jot" });
  await sheet.getByLabel("Jot text").fill("polished thought");
  await sheet.getByRole("button", { name: /Notes/ }).click();
  await expectText(page, ".toast", /kept to Notes/);
  expect(
    (await page.locator(".jot-bubble").count()) === 0,
    "jot should leave the stream",
  );
  await page.getByRole("button", { name: "Library" }).click();
  await expectText(page, ".lib-name", /polished thought/);
  await ctx.close();
});

await scenario("keep from edit sheet: People jumps to the name step", async () => {
  const seed = [
    note({ shelf: "people", title: "Ana", text: "loves tulips", day: todayKey() }),
    note({ text: "ana mentioned a cabin trip", day: todayKey() }),
  ];
  const { ctx, page } = await freshPage(seed);
  await page.locator(".jot-bubble").click();
  const sheet = page.getByRole("dialog", { name: "Edit jot" });
  await sheet.getByRole("button", { name: /People/ }).click();
  // Straight to "who is this about?", no shelf list in between.
  await page.waitForSelector(".people-suggest");
  await page.locator(".people-suggest .chip", { hasText: "Ana" }).click();
  await page.getByRole("button", { name: "Keep", exact: true }).click();
  await expectText(page, ".toast", /added to Ana/);
  await page.getByRole("button", { name: "Library" }).click();
  await page.locator(".lib-main", { hasText: "Ana" }).click();
  const body = await page.getByLabel("Note text").inputValue();
  expect(
    body === "loves tulips\n\nana mentioned a cabin trip",
    `unexpected People page body: ${JSON.stringify(body)}`,
  );
  await ctx.close();
});

// ---------------------------------------------------------------- pinning
await scenario("pinning: pinned notes rise to the top of the shelf", async () => {
  const old = Date.now() - 48 * 3600_000;
  const seed = [
    note({ shelf: "ideas", text: "older idea", day: todayKey(), createdAt: old, updatedAt: old + 1 }),
    note({ shelf: "ideas", text: "newest idea", day: todayKey() }),
  ];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: "Library" }).click();
  let names = await page.locator(".lib-name").allInnerTexts();
  expect(names[0] === "newest idea", `expected newest first, got ${names}`);
  await page.getByRole("button", { name: "Pin older idea" }).click();
  names = await page.locator(".lib-name").allInnerTexts();
  expect(names[0] === "older idea", "pinned note should sort first");
  await page.reload();
  await page.getByRole("button", { name: "Library" }).click();
  names = await page.locator(".lib-name").allInnerTexts();
  expect(names[0] === "older idea", "pin should persist");
  await page.getByRole("button", { name: "Unpin older idea" }).click();
  names = await page.locator(".lib-name").allInnerTexts();
  expect(names[0] === "newest idea", "unpin should restore date order");
  await ctx.close();
});

// -------------------------------------------------------- library editor
await scenario("library: + New note creates on the picked shelf", async () => {
  const { ctx, page } = await freshPage();
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("button", { name: "+ New note" }).click();
  const sheet = page.getByRole("dialog", { name: "New note" });
  await sheet.getByLabel("Title").fill("Balcony plan");
  await sheet.getByLabel("Note text").fill("herbs in boxes");
  await sheet.getByRole("radio", { name: "Ideas" }).click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await page.getByRole("radio", { name: "Ideas" }).click();
  await expectText(page, ".lib-name", /Balcony plan/);
  // Move it between shelves from the editor.
  await page.locator(".lib-main", { hasText: "Balcony plan" }).click();
  const edit = page.getByRole("dialog", { name: "Edit note" });
  await edit.getByRole("radio", { name: "Notes" }).click();
  await edit.getByRole("button", { name: "Done" }).click();
  await page.getByRole("radio", { name: "Notes", exact: true }).click();
  await expectText(page, ".lib-name", /Balcony plan/);
  await ctx.close();
});

// ------------------------------------------------------------------ themes
await scenario("themes: dark override and accents stamp the root", async () => {
  const { ctx, page } = await freshPage();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("radio", { name: "Dark" }).click();
  expect(
    (await page.evaluate(() => document.documentElement.dataset.theme)) ===
      "dark",
    "data-theme should be dark",
  );
  await dialog.getByRole("radio", { name: "Emerald" }).click();
  expect(
    (await page.evaluate(() => document.documentElement.dataset.accent)) ===
      "emerald",
    "data-accent should be emerald",
  );
  // Persists across reloads.
  await page.reload();
  await page.waitForSelector(".wordmark");
  expect(
    (await page.evaluate(
      () =>
        document.documentElement.dataset.theme +
        "/" +
        document.documentElement.dataset.accent,
    )) === "dark/emerald",
    "theme + accent should persist",
  );
  // Back to defaults.
  await page.getByRole("button", { name: "Settings" }).click();
  await dialog.getByRole("radio", { name: "System" }).click();
  await dialog.getByRole("radio", { name: "Azure" }).click();
  expect(
    (await page.evaluate(
      () => document.documentElement.dataset.theme === undefined,
    )) === true,
    "System should clear data-theme",
  );
  await ctx.close();
});

// -------------------------------------------------- export/import round trip
await scenario("backup: export then import round-trips every note", async () => {
  const seed = [
    note({ text: "stream survivor", day: todayKey() }),
    note({ shelf: "notes", title: "Kept", text: "kept body", day: todayKey() }),
    note({ shelf: "people", title: "Ana", text: "loves tulips", day: todayKey() }),
  ];
  const { ctx, page } = await freshPage(seed);
  await page.getByRole("button", { name: "Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  // Keep the file beyond the context's lifetime.
  const path = `/tmp/claude-0/-home-user/6ced9ede-b9c6-5119-9940-7ad8de7ece78/scratchpad/${download.suggestedFilename()}`;
  await download.saveAs(path);
  await expectText(page, ".toast", /backup saved/);
  await ctx.close();

  // A different device: nothing seeded, import the file.
  const fresh = await freshPage();
  await fresh.page.getByRole("button", { name: "Settings" }).click();
  await fresh.page.locator('input[type="file"]').setInputFiles(path);
  await expectText(fresh.page, ".toast", /backup imported/);
  await fresh.page.getByRole("button", { name: "Close" }).click();
  await expectText(fresh.page, ".jot-text", /stream survivor/);
  await fresh.page.getByRole("button", { name: "Library" }).click();
  await expectText(fresh.page, ".lib-name", /Kept/);
  await expectText(fresh.page, ".lib-name", /Ana/);
  // Importing the same file again must not duplicate.
  await fresh.page.getByRole("button", { name: "Settings" }).click();
  await fresh.page.locator('input[type="file"]').setInputFiles(path);
  await expectText(fresh.page, ".toast", /backup imported/);
  await fresh.page.getByRole("button", { name: "Close" }).click();
  const names = await fresh.page.locator(".lib-name").allInnerTexts();
  expect(
    names.filter((n) => n === "Kept").length === 1,
    "re-import must not duplicate notes",
  );
  await fresh.ctx.close();
});

await scenario("backup: a junk file is refused gently", async () => {
  const { ctx, page } = await freshPage();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "junk.json",
    mimeType: "application/json",
    buffer: Buffer.from("this is not a backup"),
  });
  await expectText(page, ".toast", /couldn't read that file/);
  await ctx.close();
});

// ------------------------------------------------------ keyboard-ready toggle
await scenario("keyboard ready: ON focuses the input at boot, OFF doesn't", async () => {
  // Default settings have it ON.
  const { ctx, page } = await freshPage([], {
    theme: "light",
    accent: "azure",
    keyboardReady: true,
  });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => document.activeElement?.classList.contains("capture-input"),
    ),
    "capture input should be focused at boot when ON",
  );
  // Toggle it off in Settings; a reload should not focus.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("switch", { name: "Keyboard ready on open" }).click();
  await page.reload();
  await page.waitForSelector(".wordmark");
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => !document.activeElement?.classList.contains("capture-input"),
    ),
    "capture input must not steal focus when OFF",
  );
  await ctx.close();
});

// ------------------------------------------------------------------ wrap up
await browser.close();
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) {
    console.error(`\n--- ${f.name}\n${f.err?.stack ?? f.err}`);
  }
  process.exit(1);
}
