import { CONFIG } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('BootGuard');
const KEY = `${CONFIG.STORAGE_PREFIX}boot_guard`;

/** 0 = normal, 1 = bounded channel list, 2 = bounded list and no guide on boot. */
export type SafeLevel = 0 | 1 | 2;

interface BootGuardState {
  /** Set while a channel load is in its risky first window. */
  pendingSince?: number;
  level?: SafeLevel;
  /** The sources the level was earned with; other sources start at 0. */
  sources?: string;
}

function read(): BootGuardState {
  try {
    const raw = localStorage.getItem(KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' ? value as BootGuardState : {};
  } catch {
    return {};
  }
}

function write(state: BootGuardState): void {
  try {
    if (state.pendingSince === undefined && !state.level) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // A full localStorage only loses the crash-loop guard, never the load.
  }
}

let settleTimer: ReturnType<typeof setTimeout> | null = null;
let active = false;

/**
 * A webOS TV kills an app that outgrows its memory budget without any event,
 * and the relaunch would load the same oversized list and die again. The
 * guard marks the load window; finding the mark still set on the next boot
 * means the previous one never finished, so the level steps up. A level that
 * worked sticks for those sources, so the app settles instead of alternating
 * between a crash and a recovery.
 */
export const BootGuard = {
  /** Call before the channel load; returns the level this boot runs at. */
  begin(sources: string): SafeLevel {
    const state = read();
    let level: SafeLevel = state.sources === sources ? state.level ?? 0 : 0;
    if (state.pendingSince !== undefined) {
      level = level >= 1 ? 2 : 1;
      log.warn(
        'Previous channel load never finished; stepping up safe mode',
        'event=boot.safe_mode.entered',
        `level=${String(level)}`,
      );
    }
    write({ pendingSince: Date.now(), level, sources });
    active = true;
    return level;
  },

  /** The load survived its risky window: clear the mark, keep the level. */
  settle(delayMs: number = CONFIG.SAFE_MODE_BOOT_WINDOW_MS): void {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      BootGuard.release();
    }, delayMs);
  },

  /** Closing or backgrounding the app is a clean exit, not a crash. */
  release(): void {
    if (!active) return;
    active = false;
    const state = read();
    delete state.pendingSince;
    write(state);
  },

  /** Back to the full list, e.g. after the user asks for it. */
  reset(): void {
    const state = read();
    delete state.level;
    write(state);
  },

  level(): SafeLevel {
    return read().level ?? 0;
  },

  installExitHandlers(): void {
    const release = (): void => BootGuard.release();
    window.addEventListener('pagehide', release);
    window.addEventListener('beforeunload', release);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') release();
    });
  },
};

export function sourceFingerprint(sources: { id: string; url: string; enabled?: boolean }[]): string {
  return sources
    .filter(source => source.enabled !== false)
    .map(source => `${source.id}|${source.url}`)
    .join('\n');
}
