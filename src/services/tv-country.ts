import { CONFIG } from '../config';
import { createLogger } from '../utils/logger';
import { lunaRequest, isLunaAvailable, type LunaResponse } from './luna';

const log = createLogger('TvCountry');
const CACHE_KEY = `${CONFIG.STORAGE_PREFIX}tv_country`;
const REQUEST_TIMEOUT_MS = 3000;

// ISO 3166-1 alpha-3 → alpha-2 for the TV's Location setting, which the
// settings service reports in alpha-3.
const ALPHA3: Record<string, string> = {
  SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', ISL: 'IS', DEU: 'DE', AUT: 'AT', CHE: 'CH',
  LIE: 'LI', FRA: 'FR', BEL: 'BE', NLD: 'NL', LUX: 'LU', GBR: 'GB', IRL: 'IE', ESP: 'ES',
  PRT: 'PT', ITA: 'IT', MLT: 'MT', GRC: 'GR', CYP: 'CY', POL: 'PL', CZE: 'CZ', SVK: 'SK',
  HUN: 'HU', ROU: 'RO', BGR: 'BG', HRV: 'HR', SVN: 'SI', SRB: 'RS', BIH: 'BA', MNE: 'ME',
  MKD: 'MK', ALB: 'AL', EST: 'EE', LVA: 'LV', LTU: 'LT', UKR: 'UA', BLR: 'BY', MDA: 'MD',
  RUS: 'RU', TUR: 'TR', GEO: 'GE', ARM: 'AM', AZE: 'AZ', KAZ: 'KZ', UZB: 'UZ', ISR: 'IL',
  PSE: 'PS', JOR: 'JO', LBN: 'LB', SYR: 'SY', IRQ: 'IQ', IRN: 'IR', SAU: 'SA', ARE: 'AE',
  QAT: 'QA', KWT: 'KW', BHR: 'BH', OMN: 'OM', YEM: 'YE', EGY: 'EG', LBY: 'LY', TUN: 'TN',
  DZA: 'DZ', MAR: 'MA', NGA: 'NG', GHA: 'GH', KEN: 'KE', ZAF: 'ZA', ETH: 'ET', SEN: 'SN',
  CIV: 'CI', CMR: 'CM', USA: 'US', CAN: 'CA', MEX: 'MX', BRA: 'BR', ARG: 'AR', CHL: 'CL',
  COL: 'CO', PER: 'PE', VEN: 'VE', ECU: 'EC', URY: 'UY', PRY: 'PY', BOL: 'BO', CRI: 'CR',
  PAN: 'PA', GTM: 'GT', HND: 'HN', SLV: 'SV', NIC: 'NI', DOM: 'DO', CUB: 'CU', PRI: 'PR',
  JAM: 'JM', TTO: 'TT', IND: 'IN', PAK: 'PK', BGD: 'BD', LKA: 'LK', NPL: 'NP', AFG: 'AF',
  CHN: 'CN', HKG: 'HK', TWN: 'TW', JPN: 'JP', KOR: 'KR', PRK: 'KP', MNG: 'MN', VNM: 'VN',
  THA: 'TH', MYS: 'MY', SGP: 'SG', IDN: 'ID', PHL: 'PH', KHM: 'KH', LAO: 'LA', MMR: 'MM',
  AUS: 'AU', NZL: 'NZ', AND: 'AD', MCO: 'MC', SMR: 'SM', VAT: 'VA',
};

interface CountrySettingsResponse extends LunaResponse {
  settings?: { country?: unknown; smartServiceCountryCode2?: unknown };
}

export function toAlpha2(code: unknown): string {
  if (typeof code !== 'string') return '';
  const upper = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return ALPHA3[upper] ?? '';
}

function readCache(): string {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function writeCache(code: string): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(code));
  } catch {
    // Only costs the next boot its instant answer.
  }
}

// The UI language's region, e.g. sv-SE → SE: a guess, used only when the TV
// can't be asked (desktop preview) and nothing is cached.
function localeRegion(): string {
  const tag = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const region = (tag.split(/[-_]/)[1] ?? '').toUpperCase();
  return region === 'UK' ? 'GB' : region;
}

let current = '';

/**
 * The country the TV is set to (Settings > General > Location), as an
 * ISO alpha-2 code. The UI language says nothing about where a viewer lives —
 * an English menu on a TV in Sweden is common — so the Location setting
 * decides which country's channels Live opens on.
 */
export const TvCountry = {
  get(): string {
    return current || readCache() || localeRegion();
  },

  /** Asks the TV once; resolves to true when that changed the answer. */
  load(): Promise<boolean> {
    if (!isLunaAvailable()) return Promise.resolve(false);
    const before = TvCountry.get();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (code: string, source: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code) {
          current = code;
          writeCache(code);
        }
        log.info('TV country resolved', 'event=live.tv_country', `source=${source}`,
          `country=${code || 'none'}`);
        resolve(TvCountry.get() !== before);
      };
      const timer = setTimeout(() => finish('', 'timeout'), REQUEST_TIMEOUT_MS);
      lunaRequest<CountrySettingsResponse>('luna://com.webos.settingsservice', {
        method: 'getSystemSettings',
        parameters: { category: 'option', keys: ['country', 'smartServiceCountryCode2'] },
        onSuccess: (response) => {
          const location = toAlpha2(response.settings?.country);
          const service = toAlpha2(response.settings?.smartServiceCountryCode2);
          finish(location || service, location ? 'location' : service ? 'service' : 'none');
        },
        onFailure: () => finish('', 'failed'),
      });
    });
  },

  /** Test hook: forget what this session learned. */
  reset(): void {
    current = '';
  },
};
