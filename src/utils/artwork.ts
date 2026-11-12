// Most Xtream panels relay TMDB artwork, whose CDN serves any rendition by
// the size segment of its URL (…/t/p/<size>/<file>). Asking for the size a
// slot really draws keeps poster rails light — a 600×900 poster decodes to
// 2 MB, a w342 one to a third of that — and keeps a full-screen backdrop sharp
// without fetching a multi-megabyte original. The UI plane is 1920×1080 even
// on a 4K panel, so these sizes are the most the screen can show.
const TMDB_IMAGE = /^(https?:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)(\/[^?#]+)/i;

export type ArtworkSize = 'w342' | 'w500' | 'w780' | 'w1280';

export function sizedArtwork(url: string, size: ArtworkSize): string {
  const match = TMDB_IMAGE.exec(url);
  return match ? match[1] + size + match[3] : url;
}
