import { CONFIG } from '../config';
import { createLogger } from '../utils/logger';
import { isLunaAvailable, lunaRequest, type LunaResponse } from './luna';
import { StorageService } from './storage-service';

const log = createLogger('StreamQuality');
const UHD_CACHE_KEY = `${CONFIG.STORAGE_PREFIX}panel_uhd`;
const REQUEST_TIMEOUT_MS = 3000;

// Where the native adaptive player starts before it has measured anything.
// High enough for a 4K HEVC rendition (or a 1080p top rung on an FHD panel);
// a slower link steps down after the first segments, a fast one never waits
// through a blurry ramp-up.
const START_BPS_UHD = 20000000;
const START_BPS_FHD = 8000000;

export type StreamQualityMode = 'maximum' | 'standard';

export interface AdaptiveStreamingOption {
  maxWidth: number;
  maxHeight: number;
  bps?: { start: number };
}

interface SystemInfoResponse extends LunaResponse {
  UHD?: unknown;
}

function readCache(): boolean | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(UHD_CACHE_KEY) ?? 'null');
    return typeof value === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

function writeCache(value: boolean): void {
  try {
    localStorage.setItem(UHD_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Only costs the next boot its cached answer.
  }
}

let uhd: boolean | null = null;

/**
 * The webOS native player limits adaptive HLS/DASH to 1920×1080 and starts
 * every stream at a conservative bitrate unless the page says otherwise
 * (mediaOption `adaptiveStreaming`). On a 4K panel that hides every 2160p
 * rendition and makes each channel open soft. Maximum lifts the ceiling to
 * the panel and starts high; Standard leaves the TV's defaults.
 */
export const StreamQuality = {
  isUhd(): boolean {
    return uhd ?? readCache() ?? false;
  },

  /** Asks the TV whether its panel is UHD; cached for the next launch. */
  load(): Promise<void> {
    if (!isLunaAvailable()) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: boolean | null, source: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (value !== null) {
          uhd = value;
          writeCache(value);
        }
        log.info('Panel resolution resolved', 'event=playback.panel', `source=${source}`,
          `uhd=${value === null ? 'unknown' : value ? '1' : '0'}`);
        resolve();
      };
      const timer = setTimeout(() => finish(null, 'timeout'), REQUEST_TIMEOUT_MS);
      lunaRequest<SystemInfoResponse>('luna://com.webos.service.tv.systemproperty', {
        method: 'getSystemInfo',
        parameters: { keys: ['UHD'] },
        onSuccess: (response) => {
          const value = response.UHD;
          finish(value === true || value === 'true' ? true
            : value === false || value === 'false' ? false : null, 'system_info');
        },
        onFailure: () => finish(null, 'failed'),
      });
    });
  },

  mode(): StreamQualityMode {
    return StorageService.getStreamQuality();
  },

  /** The native player's adaptive limits, or null for the TV's defaults. */
  adaptiveStreaming(): AdaptiveStreamingOption | null {
    if (StreamQuality.mode() !== 'maximum') return null;
    const panelUhd = StreamQuality.isUhd();
    return {
      maxWidth: panelUhd ? 3840 : 1920,
      maxHeight: panelUhd ? 2160 : 1080,
      bps: { start: panelUhd ? START_BPS_UHD : START_BPS_FHD },
    };
  },

  /** Test hook. */
  reset(): void {
    uhd = null;
  },
};
