import { describe, expect, it } from 'vitest';
import { sizedArtwork } from './artwork';

describe('sizedArtwork', () => {
  it('asks the TMDB CDN for the size the slot draws', () => {
    expect(sizedArtwork('https://image.tmdb.org/t/p/w600_and_h900_bestv2/a1.jpg', 'w342'))
      .toBe('https://image.tmdb.org/t/p/w342/a1.jpg');
    expect(sizedArtwork('http://image.tmdb.org/t/p/original/b2.jpg', 'w1280'))
      .toBe('http://image.tmdb.org/t/p/w1280/b2.jpg');
  });

  it('leaves other hosts and malformed paths alone', () => {
    expect(sizedArtwork('http://host/poster/w600/a.jpg', 'w342')).toBe('http://host/poster/w600/a.jpg');
    expect(sizedArtwork('https://image.tmdb.org/t/p/', 'w342')).toBe('https://image.tmdb.org/t/p/');
    expect(sizedArtwork('', 'w342')).toBe('');
  });
});
