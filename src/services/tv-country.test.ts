// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TvCountry, toAlpha2 } from './tv-country';

type Reply = Record<string, unknown> | null;
let reply: Reply = null;
const calls: { uri: string; payload: unknown }[] = [];

class FakeBridge {
  onservicecallback: ((message: string) => void) | null = null;
  call(uri: string, payload: string): void {
    calls.push({ uri, payload: JSON.parse(payload) });
    const message = reply;
    if (message) setTimeout(() => this.onservicecallback?.(JSON.stringify(message)), 0);
  }
  cancel(): void {}
}

const bridged = window as unknown as { PalmServiceBridge?: typeof FakeBridge };

describe('TvCountry', () => {
  beforeEach(() => {
    localStorage.clear();
    TvCountry.reset();
    calls.length = 0;
    reply = null;
    bridged.PalmServiceBridge = FakeBridge;
  });
  afterEach(() => {
    delete bridged.PalmServiceBridge;
  });

  it('reads the Location setting, not the UI language', async () => {
    reply = { returnValue: true, settings: { country: 'SWE', smartServiceCountryCode2: 'GB' } };
    expect(await TvCountry.load()).toBe(true);
    expect(TvCountry.get()).toBe('SE');
    expect(calls[0].uri).toBe('luna://com.webos.settingsservice/getSystemSettings');
    expect(calls[0].payload).toMatchObject({ category: 'option', keys: ['country', 'smartServiceCountryCode2'] });
  });

  it('falls back to the LG Services country', async () => {
    reply = { returnValue: true, settings: { country: 'XYZ', smartServiceCountryCode2: 'no' } };
    await TvCountry.load();
    expect(TvCountry.get()).toBe('NO');
  });

  it('remembers the answer for the next launch', async () => {
    reply = { returnValue: true, settings: { country: 'DNK' } };
    await TvCountry.load();
    TvCountry.reset();
    delete bridged.PalmServiceBridge;
    expect(TvCountry.get()).toBe('DK');
  });

  it('keeps the language guess when the TV cannot be asked', async () => {
    reply = { returnValue: false, errorText: 'no' };
    expect(await TvCountry.load()).toBe(false);
    expect(TvCountry.get()).toBe((navigator.language.split('-')[1] ?? '').toUpperCase());
  });
});

describe('toAlpha2', () => {
  it('maps alpha-3 and keeps alpha-2', () => {
    expect(toAlpha2('SWE')).toBe('SE');
    expect(toAlpha2('GBR')).toBe('GB');
    expect(toAlpha2('se')).toBe('SE');
    expect(toAlpha2('QQQ')).toBe('');
    expect(toAlpha2(7)).toBe('');
  });
});
