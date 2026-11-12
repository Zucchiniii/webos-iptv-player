// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ mode: 'maximum' as 'maximum' | 'standard' }));
vi.mock('./storage-service', () => ({
  StorageService: { getStreamQuality: () => storage.mode },
}));

import { StreamQuality } from './stream-quality';
import { nativeSourceType } from '../components/player-pipeline';
import { buildLoadParameters } from './luna-media';
import { parseMediaOption } from '../utils/webos-media-option';

let reply: Record<string, unknown> | null = null;
class FakeBridge {
  onservicecallback: ((message: string) => void) | null = null;
  call(): void {
    const message = reply;
    if (message) setTimeout(() => this.onservicecallback?.(JSON.stringify(message)), 0);
  }
  cancel(): void {}
}
const bridged = window as unknown as { PalmServiceBridge?: typeof FakeBridge };
const ua = navigator.userAgent;
const setUserAgent = (value: string) =>
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value });

describe('StreamQuality', () => {
  beforeEach(() => {
    localStorage.clear();
    StreamQuality.reset();
    storage.mode = 'maximum';
    reply = null;
    bridged.PalmServiceBridge = FakeBridge;
  });
  afterEach(() => {
    delete bridged.PalmServiceBridge;
    setUserAgent(ua);
  });

  it('lifts the ceiling to 4K and starts high on a UHD panel', async () => {
    reply = { returnValue: true, UHD: 'true' };
    await StreamQuality.load();
    expect(StreamQuality.adaptiveStreaming())
      .toEqual({ maxWidth: 3840, maxHeight: 2160, bps: { start: 20000000 } });
  });

  it('keeps 1080p on an FHD panel or when the panel is unknown', async () => {
    expect(StreamQuality.adaptiveStreaming()).toMatchObject({ maxWidth: 1920, maxHeight: 1080 });
    reply = { returnValue: true, UHD: 'false' };
    await StreamQuality.load();
    expect(StreamQuality.adaptiveStreaming())
      .toEqual({ maxWidth: 1920, maxHeight: 1080, bps: { start: 8000000 } });
  });

  it('remembers the panel for the next launch', async () => {
    reply = { returnValue: true, UHD: true };
    await StreamQuality.load();
    StreamQuality.reset();
    delete bridged.PalmServiceBridge;
    expect(StreamQuality.isUhd()).toBe(true);
  });

  it('leaves the TV defaults in Standard', () => {
    storage.mode = 'standard';
    expect(StreamQuality.adaptiveStreaming()).toBeNull();
  });

  it('puts the limits on a native HLS source on webOS only', async () => {
    reply = { returnValue: true, UHD: 'true' };
    await StreamQuality.load();
    expect(nativeSourceType('application/vnd.apple.mpegurl')).toBe('application/vnd.apple.mpegurl');
    setUserAgent('Mozilla/5.0 (Web0S; Linux/SmartTV)');
    const type = nativeSourceType('application/vnd.apple.mpegurl');
    expect(type.startsWith('application/vnd.apple.mpegurl;mediaOption=')).toBe(true);
    expect(parseMediaOption(type)).toEqual({
      mediaTransportType: 'HLS',
      option: { adaptiveStreaming: { maxWidth: 3840, maxHeight: 2160, bps: { start: 20000000 } } },
    });
    expect(nativeSourceType('video/mp2t')).toBe('video/mp2t');
    storage.mode = 'standard';
    expect(nativeSourceType('application/vnd.apple.mpegurl')).toBe('application/vnd.apple.mpegurl');
  });

  it('carries the limits into a Luna load', () => {
    const adaptive = { maxWidth: 3840, maxHeight: 2160, bps: { start: 20000000 } };
    const params = buildLoadParameters('http://host/a.m3u8', 'HLS', 'app1', 'w1', {}, '', adaptive);
    expect((params.payload as { option: Record<string, unknown> }).option.adaptiveStreaming).toEqual(adaptive);
    const plain = buildLoadParameters('http://host/a.m3u8', 'HLS', 'app1', 'w1', {});
    expect((plain.payload as { option: Record<string, unknown> }).option.adaptiveStreaming).toBeUndefined();
  });
});
