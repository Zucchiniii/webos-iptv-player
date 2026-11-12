// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BootGuard, sourceFingerprint } from './boot-guard';

const SOURCES = sourceFingerprint([{ id: 'a', url: 'http://host/a' }]);

describe('BootGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    BootGuard.release();
    vi.useRealTimers();
  });

  it('boots normally when the previous load finished', () => {
    expect(BootGuard.begin(SOURCES)).toBe(0);
    BootGuard.settle(10);
    vi.advanceTimersByTime(10);
    expect(BootGuard.begin(SOURCES)).toBe(0);
  });

  it('steps up after each load that never finished, then sticks', () => {
    expect(BootGuard.begin(SOURCES)).toBe(0);
    // No settle or release: the TV killed the app mid-load.
    expect(BootGuard.begin(SOURCES)).toBe(1);
    expect(BootGuard.begin(SOURCES)).toBe(2);
    BootGuard.release();
    expect(BootGuard.begin(SOURCES)).toBe(2);
  });

  it('treats closing the app as a clean exit', () => {
    BootGuard.begin(SOURCES);
    BootGuard.release();
    expect(BootGuard.begin(SOURCES)).toBe(0);
  });

  it('starts over when the sources change', () => {
    BootGuard.begin(SOURCES);
    expect(BootGuard.begin(SOURCES)).toBe(1);
    BootGuard.release();
    expect(BootGuard.begin(sourceFingerprint([{ id: 'b', url: 'http://host/b' }]))).toBe(0);
  });

  it('returns to the full list on reset', () => {
    BootGuard.begin(SOURCES);
    BootGuard.begin(SOURCES);
    BootGuard.release();
    BootGuard.reset();
    expect(BootGuard.begin(SOURCES)).toBe(0);
  });

  it('ignores disabled sources in the fingerprint', () => {
    expect(sourceFingerprint([
      { id: 'a', url: 'http://host/a' },
      { id: 'b', url: 'http://host/b', enabled: false },
    ])).toBe(SOURCES);
  });
});
