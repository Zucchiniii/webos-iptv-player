// Renders the launcher icons from assets/icon.svg:
//
//   node scripts/build-icons.mjs
//
// icon80.png and icon130.png (appinfo `icon` / `largeIcon`, copied under a
// cache-busting name by esbuild.config.mjs, and the Homebrew Channel
// listing) are full-bleed squares: the TV's launcher rounds its own tiles. icon-rounded.svg is the same art with the corners rounded, for the
// README. Headless Chromium does the rasterizing, so no SVG tool is needed.

import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ASSETS = join(process.cwd(), 'assets');
const svg = await readFile(join(ASSETS, 'icon.svg'), 'utf8');
const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const browser = await chromium.launch();
try {
  for (const size of [80, 130]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<body style="margin:0"><img src="${src}" width="${size}" height="${size}" style="display:block"></body>`,
    );
    await page.locator('img').evaluate((img) => img.decode());
    await page.screenshot({ path: join(ASSETS, `icon${size}.png`), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}

const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const [, , width, height] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 512 512').split(/\s+/).map(Number);
const radius = Math.round(width * 0.22 * 100) / 100;
await writeFile(join(ASSETS, 'icon-rounded.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 ${width} ${height}">
  <clipPath id="tile"><rect width="${width}" height="${height}" rx="${radius}"/></clipPath>
  <g clip-path="url(#tile)">${inner}</g>
</svg>
`);
console.log('Icons generated: assets/icon80.png, assets/icon130.png, assets/icon-rounded.svg');
