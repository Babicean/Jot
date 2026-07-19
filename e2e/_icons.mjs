// One-off asset generator: renders the jot-mark icon set and splash screens
// with the preinstalled chromium. Rerun after changing the mark.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const ROOT = new URL("..", import.meta.url).pathname;
const RES = `${ROOT}android/app/src/main/res`;

// The mark: one quick pen stroke and its dot — a jot and its tittle.
// Geometry lives in a 512 box and is scaled per asset.
function mark(color, scale = 1, cx = 256, cy = 256) {
  const s = scale;
  return `
    <g transform="translate(${cx} ${cy}) scale(${s}) translate(-256 -256)"
       fill="none" stroke="${color}" stroke-linecap="round">
      <path d="M150 384 C 234 356, 312 264, 348 158" stroke-width="47"/>
      <circle cx="376" cy="102" r="27" fill="${color}" stroke="none"/>
    </g>`;
}

const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3d7bf2"/>
      <stop offset="1" stop-color="#2254c2"/>
    </linearGradient>
  </defs>`;

function tile(rx, markScale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    ${GRADIENT}
    <rect width="512" height="512" rx="${rx}" fill="url(#g)"/>
    ${mark("#ffffff", markScale)}
  </svg>`;
}

function circleTile(markScale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    ${GRADIENT}
    <circle cx="256" cy="256" r="256" fill="url(#g)"/>
    ${mark("#ffffff", markScale)}
  </svg>`;
}

// Adaptive-icon foreground: transparent, mark inside the 66/108 safe zone.
function foreground() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    ${mark("#ffffff", 0.46)}
  </svg>`;
}

function splash(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#f5f6f8"/>
    ${mark("#2e6be6", 0.42, w / 2, h / 2)}
  </svg>`;
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const page = await browser.newPage();

async function render(svg, w, h, path, transparent) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<style>*{margin:0}body{${transparent ? "background:transparent" : ""}}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`,
  );
  await page.screenshot({ path, omitBackground: !!transparent });
  console.log("wrote", path.replace(ROOT, ""));
}

// PWA + favicon set
mkdirSync(`${ROOT}public/icons`, { recursive: true });
await render(tile(0), 192, 192, `${ROOT}public/icons/icon-192.png`);
await render(tile(0), 512, 512, `${ROOT}public/icons/icon-512.png`);
await render(tile(0, 0.78), 512, 512, `${ROOT}public/icons/maskable-512.png`);
await render(tile(0), 180, 180, `${ROOT}public/icons/apple-touch-icon.png`);

// Android launcher mipmaps
const DPIS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dpi, size] of Object.entries(DPIS)) {
  const dir = `${RES}/mipmap-${dpi}`;
  await render(tile(90), size, size, `${dir}/ic_launcher.png`);
  await render(circleTile(0.92), size, size, `${dir}/ic_launcher_round.png`, true);
  await render(foreground(), size * 2.25, size * 2.25, `${dir}/ic_launcher_foreground.png`, true);
}

// Splash screens (same dimensions Capacitor shipped)
const SPLASH = [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
];
for (const [dir, w, h] of SPLASH) {
  const size = Math.min(w, h) * 0.55;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#f5f6f8"/>
    <g transform="translate(${w / 2 - size / 2} ${h / 2 - size / 2}) scale(${size / 512})">
      ${mark("#2e6be6", 0.62, 256, 256).replace('stroke-width="47"', 'stroke-width="47"')}
    </g>
  </svg>`;
  await render(svg, w, h, `${RES}/${dir}/splash.png`);
}

await browser.close();
console.log("done");
