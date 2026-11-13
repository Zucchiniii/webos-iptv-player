// Generates the README shots of the Live grid and the in-player channel
// panel, from a country-prefixed playlist with logos and a guide:
//
//   node scripts/generate-live-screenshots.mjs
//
//   live-grid.png        Live: country chips, the focus header, the card grid
//   player-channels.png  watching: the channel panel and its details card
//
// generate-screenshots.mjs covers every other view; its demo list has no
// countries or logos, which these two views are about. All channel and
// program names are fictional. Dev-only, like that script.

import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, 'docs', 'screenshots');
const TZ = 'Europe/Stockholm';
const NOW = new Date('2026-06-12T20:42:00+02:00').getTime();
const MIME = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const COUNTRIES = ['SE', 'NO', 'DK', 'FI', 'UK', 'DE', 'NL', 'US'];
const GENRES = ['Sport', 'News', 'Movies', 'Kids', 'Documentary', 'Music', 'Entertainment', 'Series'];
const BRANDS = ['Nova', 'Aurora', 'Polar', 'Vista', 'Orbit', 'Summit', 'Coast', 'Metro', 'Arena', 'Echo'];
const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#ea580c', '#4f46e5', '#0d9488'];
// Two names too long for a card or a panel row, to show where they wrap.
const LONG_NAMES = {
  'SE|Sport|0': (brand) => `${brand} Sport Premium Football 4K`,
  'SE|Documentary|0': (brand) => `${brand} Nature and Science Documentary HD`,
};
const PROGRAMS = {
  Sport: [['Matchday Live: North vs Harbor', 'Second-half coverage from a sold-out stadium, with the studio panel on every big moment and the race for the title.'],
    ['Studio Football', 'The evening\'s goals, the talking points and the table, with former players in the studio.'],
    ['Racing Weekend', 'Qualifying highlights and the build-up to Sunday\'s race.']],
  News: [['Evening News', 'The day\'s main stories at home and abroad, with weather and sport.'],
    ['The Briefing', 'Analysis of the stories shaping the week.']],
  Movies: [['The Last Lighthouse', 'A keeper on a remote island finds a stranger washed ashore during the year\'s worst storm.'],
    ['Night Train to Sundsvall', 'Strangers on an overnight train realize they share the same secret.']],
  Kids: [['Robot Friends', 'Pip and Bolt build a rocket out of cardboard boxes.'], ['Forest Patrol', 'The patrol helps a lost owl find its way home.']],
  Documentary: [['Wild North: The Long Winter', 'How wolves, reindeer and arctic foxes survive six months of darkness above the Arctic Circle.'],
    ['Deep Blue', 'A dive to the coral reefs no camera had reached before.']],
  Music: [['Top Hits Now', 'The week\'s biggest songs, back to back.'], ['Live at the Harbor', 'A summer concert from the waterfront stage.']],
  Entertainment: [['Kitchen Heroes', 'Four home cooks, one mystery box and thirty minutes on the clock.'], ['Late Night Live', 'Guests, music and the day\'s news with a twist.']],
  Series: [['Harbor Lights S3E4', 'Detective Lind follows a lead to the old shipyard, where nothing is what it seems.'], ['The Firm S2E1', 'A new partner arrives with plans that split the office.']],
};

const channels = [];
for (const country of COUNTRIES) {
  for (const genre of GENRES) {
    for (let i = 0; i < 12; i++) {
      const n = channels.length;
      const brand = BRANDS[(n * 3 + i) % BRANDS.length];
      const long = LONG_NAMES[`${country}|${genre}|${i}`];
      const name = long ? long(brand) : `${brand} ${genre}${i ? ` ${i + 1}` : ''}${i % 4 === 0 ? ' HD' : ''}`;
      channels.push({ id: `c${n}`, name: `${country} ${name}`, group: `${country} | ${genre}`, genre, brand });
    }
  }
}

function m3u(origin) {
  let text = `#EXTM3U url-tvg="${origin}/epg.xml"\n`;
  for (const ch of channels) {
    text += `#EXTINF:-1 tvg-id="${ch.id}" tvg-logo="${origin}/logo/${ch.id.slice(1)}.svg" group-title="${ch.group}",${ch.name}\n`;
    text += `${origin}/live/${ch.id}.m3u8\n`;
  }
  return text;
}

function xmltv() {
  const stamp = (t) => new Date(t).toISOString().replace(/[-:T]/g, '').slice(0, 14) + ' +0000';
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let text = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n';
  for (const ch of channels) text += `<channel id="${ch.id}"><display-name>${escape(ch.name)}</display-name></channel>\n`;
  channels.forEach((ch, n) => {
    const list = PROGRAMS[ch.genre];
    let t = NOW - (20 + (n % 5) * 9) * 60000;
    for (let k = 0; k < 6; k++) {
      const [title, desc] = list[(n + k) % list.length];
      const length = (45 + ((n + k) % 3) * 30) * 60000;
      text += `<programme start="${stamp(t)}" stop="${stamp(t + length)}" channel="${ch.id}"><title>${escape(title)}</title><desc>${escape(desc)}</desc></programme>\n`;
      t += length;
    }
  });
  return text + '</tv>\n';
}

function logo(n) {
  const ch = channels[n];
  const color = COLORS[BRANDS.indexOf(ch.brand) % COLORS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect x="14" y="46" width="172" height="108" rx="28" fill="${color}"/><text x="100" y="117" font-family="Arial, sans-serif" font-weight="900" font-size="40" fill="#fff" text-anchor="middle">${ch.brand.toUpperCase()}</text></svg>`;
}

// A quiet evening scene stands in for the video: headless Chromium has no
// stream to decode, and the TV's video plane sits under the page anyway.
const SCENE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#14203d"/><stop offset=".55" stop-color="#3d3f74"/><stop offset="1" stop-color="#d9826b"/>
      </linearGradient>
      <radialGradient id="sun" cx=".72" cy=".7" r=".25"><stop offset="0" stop-color="#ffd59e" stop-opacity=".9"/><stop offset="1" stop-color="#ffd59e" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#sky)"/>
    <rect width="1920" height="1080" fill="url(#sun)"/>
    <path d="M0 760 L240 640 L420 720 L640 560 L860 700 L1080 600 L1300 720 L1520 590 L1720 690 L1920 620 V1080 H0Z" fill="#232347" opacity=".85"/>
    <path d="M0 860 L300 780 L560 850 L820 760 L1120 860 L1400 790 L1680 870 L1920 800 V1080 H0Z" fill="#141429"/>
  </svg>`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const origin = `http://127.0.0.1:${server.address().port}`;
  if (url.pathname === '/list.m3u') return res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl' }).end(m3u(origin));
  if (url.pathname === '/epg.xml') return res.writeHead(200, { 'Content-Type': 'application/xml' }).end(xmltv());
  if (url.pathname.startsWith('/logo/')) {
    return res.writeHead(200, { 'Content-Type': 'image/svg+xml' }).end(logo(parseInt(url.pathname.slice(6), 10)));
  }
  if (url.pathname.startsWith('/live/')) return res.writeHead(404).end();
  const file = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }).end(data);
  } catch {
    res.writeHead(404).end();
  }
});

console.log('Building app (esbuild)...');
execSync('node esbuild.config.mjs --preview', { cwd: ROOT, stdio: 'inherit' });
await mkdir(SHOTS, { recursive: true });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

async function openLive() {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: TZ, locale: 'en-US' });
  const page = await context.newPage();
  await page.addInitScript(({ fixed, list }) => {
    const RealDate = Date;
    function FakeDate(...args) {
      if (!(this instanceof FakeDate)) return RealDate(...args);
      return args.length ? new RealDate(...args) : new RealDate(fixed);
    }
    FakeDate.now = () => fixed;
    FakeDate.parse = RealDate.parse;
    FakeDate.UTC = RealDate.UTC;
    FakeDate.prototype = RealDate.prototype;
    window.Date = FakeDate;
    if (!localStorage.getItem('iptv_playlists')) {
      localStorage.setItem('iptv_playlists', JSON.stringify([{ id: 'p1', name: 'My IPTV', url: list, source: 'url' }]));
      localStorage.setItem('iptv_tv_country', JSON.stringify('SE'));
      localStorage.setItem('iptv_live_preview', 'false');
    }
  }, { fixed: NOW, list: `${origin}/list.m3u` });
  await page.goto(`${origin}/`);
  await page.locator('.channel-card .channel-now').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('.channel-card img.channel-logo').first().waitFor({ state: 'visible' });
  return { context, page };
}

async function settle(page) {
  await page.evaluate(() => document.querySelectorAll('.toast').forEach((toast) => toast.remove()));
  await page.waitForTimeout(500);
}

try {
  {
    const { context, page } = await openLive();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.locator('.channel-hero-title').waitFor({ state: 'visible' });
    await settle(page);
    await page.screenshot({ path: join(SHOTS, 'live-grid.png'), animations: 'disabled', caret: 'hide' });
    console.log('  live-grid.png');
    await context.close();
  }
  {
    const { context, page } = await openLive();
    await page.keyboard.press('Enter');
    await page.locator('#view-player').waitFor({ state: 'visible' });
    await page.evaluate((scene) => {
      const hide = document.createElement('style');
      hide.textContent = '#player-osd{display:none !important}#video-player{opacity:0 !important}';
      document.head.appendChild(hide);
      const view = document.getElementById('view-player');
      view.style.background = `center / cover no-repeat url("${scene}")`;
    }, SCENE);
    await page.keyboard.press('ArrowLeft');
    await page.locator('.sidebar-peek.visible .sidebar-peek-desc').waitFor({ state: 'visible' });
    await page.waitForTimeout(400); // the panel's slide
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await settle(page);
    await page.screenshot({ path: join(SHOTS, 'player-channels.png'), animations: 'disabled', caret: 'hide' });
    console.log('  player-channels.png');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
