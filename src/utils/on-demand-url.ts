import type { XtreamLiveOutputPreference } from './xtream-url';

// Containers a live channel never uses; HLS (.m3u8), MPEG-TS (.ts), DASH
// (.mpd), and extensionless panel routes stay live.
const ON_DEMAND_EXTENSIONS = new Set([
  'mkv', 'mp4', 'm4v', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mpg', 'mpeg',
  'divx', 'xvid', '3gp', 'ogv', 'vob', 'rmvb', 'iso',
]);
const ON_DEMAND_ROUTES = new Set(['movie', 'movies', 'vod', 'series']);
const LIVE_EXTENSIONS = new Set(['m3u8', 'mpd', 'ts']);

/**
 * True for an M3U stream location that is a movie or series episode rather
 * than a live channel: an on-demand container, or an Xtream-style
 * `/movie|vod|series/.../<id>` route. A `get.php` m3u_plus list carries
 * several on-demand entries per live channel, and loading them as channels
 * is what exhausts the TV's memory.
 */
export function isOnDemandStreamLocation(location: string): boolean {
  let path = location;
  const header = path.indexOf('|');
  if (header >= 0) path = path.slice(0, header);
  const scheme = path.indexOf('://');
  if (scheme >= 0) {
    const slash = path.indexOf('/', scheme + 3);
    path = slash >= 0 ? path.slice(slash) : '/';
  }
  const query = path.search(/[?#]/);
  if (query >= 0) path = path.slice(0, query);
  const segments = path.split('/').filter(Boolean);
  if (!segments.length) return false;
  const last = segments[segments.length - 1].toLowerCase();
  const dot = last.lastIndexOf('.');
  const extension = dot > 0 ? last.slice(dot + 1) : '';
  if (ON_DEMAND_EXTENSIONS.has(extension)) return true;
  if (LIVE_EXTENSIONS.has(extension)) return false;
  if (!/^\d+(?:\.[a-z0-9]+)?$/.test(last)) return false;
  for (let i = 0; i < segments.length - 1; i++) {
    if (ON_DEMAND_ROUTES.has(segments[i].toLowerCase())) return true;
  }
  return false;
}

export interface PlaylistUrlXtreamAccount {
  baseUrl: string;
  username: string;
  password: string;
  liveOutput: XtreamLiveOutputPreference;
}

/**
 * The Xtream account behind a pasted `.../get.php?username=…&password=…`
 * playlist URL, or null for any other URL. As an account the source gets
 * Movies and Series, and Live keeps only the panel's live catalog.
 */
export function xtreamAccountFromPlaylistUrl(url: string): PlaylistUrlXtreamAccount | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const path = parsed.pathname.replace(/\/+$/, '');
  if (!/\/get\.php$/i.test(path)) return null;
  const username = parsed.searchParams.get('username') ?? '';
  const password = parsed.searchParams.get('password') ?? '';
  if (!username || !password) return null;
  const output = (parsed.searchParams.get('output') ?? '').toLowerCase();
  // MPEG-TS is the panel default and what webOS plays most reliably.
  const liveOutput: XtreamLiveOutputPreference = output === 'm3u8' || output === 'hls'
    ? 'm3u8'
    : 'ts';
  return {
    baseUrl: `${parsed.origin}${path.slice(0, -'/get.php'.length)}`,
    username,
    password,
    liveOutput,
  };
}
