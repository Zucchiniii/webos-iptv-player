import { describe, expect, it } from 'vitest';
import { groupRegion, regionCode, regionName, regionsOf } from './channel-region';

describe('groupRegion', () => {
  it.each([
    ['SE | Sport', 'SE', 'Sport'],
    ['SE: Nyheter', 'SE', 'Nyheter'],
    ['[UK] News', 'GB', 'News'],
    ['(DE) Kino', 'DE', 'Kino'],
    ['|FR| Cinema', 'FR', 'Cinema'],
    ['US - Entertainment', 'US', 'Entertainment'],
    ['SWEDEN ➾ TV4', 'SE', 'TV4'],
    ['Sverige | Barn', 'SE', 'Barn'],
    ['GER | Sport', 'DE', 'Sport'],
    ['EX-YU | Film', 'EX-YU', 'Film'],
    ['NL  Algemeen', 'NL', 'Algemeen'],
    ['United Kingdom: Sport', 'GB', 'Sport'],
  ])('reads %s as %s', (name, code, rest) => {
    expect(groupRegion(name)).toEqual({ code, rest });
  });

  it.each([
    'News',
    'Sports HD',
    'VIP | Events',
    'HD | Movies',
    '4K: Nature',
    'Kids',
    'Uncategorized',
    'PPV - Boxing',
  ])('finds no country in %s', (name) => {
    expect(groupRegion(name)).toBeNull();
  });
});

describe('regionsOf', () => {
  it('lists countries by channel count', () => {
    const counts: Record<string, number> = {
      'SE | Sport': 10, 'SE | News': 5, 'UK | Sport': 40, 'UK | News': 30, 'DE | Kino': 2, Other: 99,
    };
    expect(regionsOf(Object.keys(counts), g => counts[g])).toEqual([
      { code: 'GB', count: 70 },
      { code: 'SE', count: 15 },
      { code: 'DE', count: 2 },
    ]);
  });

  it('ignores a list that is not organized by country', () => {
    expect(regionsOf(['News', 'Sport', 'SE | Film', 'Kids'], () => 1)).toEqual([]);
    expect(regionsOf(['SE | a', 'SE | b', 'SE | c', 'SE | d'], () => 1)).toEqual([]);
  });
});

describe('region labels', () => {
  it('shows UK for GB and names regional groups', () => {
    expect(regionCode('GB')).toBe('UK');
    expect(regionCode('SE')).toBe('SE');
    expect(regionName('EX-YU', 'en')).toBe('Ex-Yu');
    expect(regionName('SE', 'en')).toBe('Sweden');
  });
});
