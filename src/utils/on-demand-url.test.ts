import { describe, expect, it } from 'vitest';
import { isOnDemandStreamLocation, xtreamAccountFromPlaylistUrl } from './on-demand-url';

describe('isOnDemandStreamLocation', () => {
  it.each([
    'http://host/movie/u/p/1.mkv',
    'http://host/series/u/p/2.mp4',
    'http://host/vod/u/p/3.avi',
    'http://host/movies/u/p/4.mkv',
    'http://host/series/u/p/5',
    'http://host/u/p/6.mkv',
    'http://host/a/film.MP4?token=1',
    'http://host/movie/u/p/7.mkv|User-Agent=Alpha',
  ])('treats %s as on demand', (location) => {
    expect(isOnDemandStreamLocation(location)).toBe(true);
  });

  it.each([
    'http://host/live/u/p/1.ts',
    'http://host/u/p/2',
    'http://host/u/p/3.m3u8',
    'http://host/a/index.m3u8',
    'http://host/movies/a/index.m3u8',
    'http://host/series/a/manifest.mpd',
    'http://host/movies/channel-a',
    'http://host/movies/u/p/8.ts',
    'http://host/',
    'rtmp://host/live/a',
  ])('keeps %s live', (location) => {
    expect(isOnDemandStreamLocation(location)).toBe(false);
  });
});

describe('xtreamAccountFromPlaylistUrl', () => {
  it('reads the account from a get.php URL', () => {
    expect(xtreamAccountFromPlaylistUrl(
      'http://host:8080/get.php?username=u1&password=p1&type=m3u_plus&output=m3u8',
    )).toEqual({ baseUrl: 'http://host:8080', username: 'u1', password: 'p1', liveOutput: 'm3u8' });
  });

  it('keeps a path prefix and defaults to MPEG-TS', () => {
    expect(xtreamAccountFromPlaylistUrl('https://host/panel/get.php?username=u&password=p'))
      .toEqual({ baseUrl: 'https://host/panel', username: 'u', password: 'p', liveOutput: 'ts' });
  });

  it.each([
    'http://host/list.m3u',
    'http://host/get.php?username=u',
    'http://host/get.php?password=p',
    'ftp://host/get.php?username=u&password=p',
    'not a url',
  ])('ignores %s', (url) => {
    expect(xtreamAccountFromPlaylistUrl(url)).toBeNull();
  });
});
