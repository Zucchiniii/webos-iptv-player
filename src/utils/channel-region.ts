// Large provider lists prefix every group with a country: "SE | Sport",
// "[UK] News", "DE: Kino", "|FR| Cinéma", "SWEDEN ➾ TV4". Reading that prefix
// lets Live offer a country picker, turning hundreds of groups into the few
// the viewer watches.

const ISO_CODES = new Set((
  'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ '
  + 'CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR '
  + 'GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG '
  + 'KH KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT '
  + 'MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW '
  + 'SA SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG '
  + 'US UY UZ VA VE VN YE ZA ZM ZW'
).split(' '));

// Three-letter and colloquial forms panels use, mapped to one code each.
const ALIASES: Record<string, string> = {
  UK: 'GB', ENG: 'GB', GBR: 'GB', USA: 'US', SWE: 'SE', NOR: 'NO', DEN: 'DK', DNK: 'DK',
  FIN: 'FI', GER: 'DE', DEU: 'DE', FRA: 'FR', ITA: 'IT', ESP: 'ES', SPA: 'ES', POR: 'PT',
  PRT: 'PT', NED: 'NL', NLD: 'NL', BEL: 'BE', POL: 'PL', TUR: 'TR', GRE: 'GR', GRC: 'GR',
  ROM: 'RO', ROU: 'RO', HUN: 'HU', CZE: 'CZ', SVK: 'SK', SUI: 'CH', AUT: 'AT', RUS: 'RU',
  UKR: 'UA', IRL: 'IE', CAN: 'CA', AUS: 'AU', BRA: 'BR', MEX: 'MX', ARG: 'AR', IND: 'IN',
  PAK: 'PK', ALB: 'AL', BIH: 'BA', SRB: 'RS', CRO: 'HR', HRV: 'HR', SLO: 'SI', BUL: 'BG',
  ISL: 'IS', EST: 'EE', LAT: 'LV', LTU: 'LT', ISR: 'IL', EGY: 'EG', KSA: 'SA',
  'EX-YU': 'EX-YU', EXYU: 'EX-YU', LATAM: 'LATAM', LATINO: 'LATAM', ARAB: 'ARAB',
  ARABIC: 'ARAB', AFRICA: 'AFRICA', AFR: 'AFRICA', ASIA: 'ASIA', NORDIC: 'NORDIC',
  CARIBBEAN: 'CARIBBEAN', KURD: 'KURD', PERSIAN: 'IR',
};

// Country names as they appear spelled out in group titles.
const NAMES: Record<string, string> = {
  SWEDEN: 'SE', SVERIGE: 'SE', NORWAY: 'NO', NORGE: 'NO', DENMARK: 'DK', DANMARK: 'DK',
  FINLAND: 'FI', SUOMI: 'FI', ICELAND: 'IS', GERMANY: 'DE', DEUTSCHLAND: 'DE', FRANCE: 'FR',
  ITALY: 'IT', ITALIA: 'IT', SPAIN: 'ES', ESPANA: 'ES', PORTUGAL: 'PT', NETHERLANDS: 'NL',
  HOLLAND: 'NL', BELGIUM: 'BE', POLAND: 'PL', POLSKA: 'PL', TURKEY: 'TR', TURKIYE: 'TR',
  GREECE: 'GR', ROMANIA: 'RO', HUNGARY: 'HU', AUSTRIA: 'AT', SWITZERLAND: 'CH', RUSSIA: 'RU',
  UKRAINE: 'UA', IRELAND: 'IE', CANADA: 'CA', AUSTRALIA: 'AU', BRAZIL: 'BR', BRASIL: 'BR',
  MEXICO: 'MX', ARGENTINA: 'AR', INDIA: 'IN', PAKISTAN: 'PK', ALBANIA: 'AL', SERBIA: 'RS',
  CROATIA: 'HR', BOSNIA: 'BA', SLOVENIA: 'SI', BULGARIA: 'BG', ISRAEL: 'IL', EGYPT: 'EG',
  'UNITED KINGDOM': 'GB', ENGLAND: 'GB', BRITAIN: 'GB', 'UNITED STATES': 'US', AMERICA: 'US',
  CZECH: 'CZ', CZECHIA: 'CZ', SLOVAKIA: 'SK', ESTONIA: 'EE', LATVIA: 'LV', LITHUANIA: 'LT',
  JAPAN: 'JP', KOREA: 'KR', CHINA: 'CN', PHILIPPINES: 'PH', THAILAND: 'TH', VIETNAM: 'VN',
  IRAN: 'IR', IRAQ: 'IQ', AFGHANISTAN: 'AF', MOROCCO: 'MA', ALGERIA: 'DZ', TUNISIA: 'TN',
};

// Leading token, then a separator: "SE | x", "SE: x", "SE - x", "SE ➾ x".
const LEADING = /^\s*[[(|{]?\s*([A-Za-z][A-Za-z -]{0,20}?)\s*[\])|}]?\s*(?:[|:»➾►▶•·/–—-]+|\s{2,})\s*(.*)$/;
// Names that themselves contain a separator character or a space.
const COMPOUND = /^\s*[[(|{]?\s*(EX-YU|UNITED KINGDOM|UNITED STATES)\s*[\])|}]?\s*(?:[|:»➾►▶•·/–—-]+|\s{2,})?\s*(.*)$/i;
// Bracketed token alone: "[SE] x", "(SE) x", "|SE| x".
const BRACKETED = /^\s*[[(|{]\s*([A-Za-z][A-Za-z -]{0,20}?)\s*[\])|}]\s*(.*)$/;

export interface GroupRegion {
  code: string;
  /** The group title without its country prefix, for display under that country. */
  rest: string;
}

function resolve(token: string): string | null {
  const upper = token.trim().toUpperCase();
  if (!upper) return null;
  if (ALIASES[upper]) return ALIASES[upper];
  if (NAMES[upper]) return NAMES[upper];
  if (upper.length === 2 && ISO_CODES.has(upper)) return upper === 'GB' ? 'GB' : upper;
  return null;
}

export function groupRegion(name: string): GroupRegion | null {
  for (const pattern of [COMPOUND, BRACKETED, LEADING]) {
    const match = pattern.exec(name);
    if (!match) continue;
    const code = resolve(match[1]);
    const rest = match[2].trim();
    if (code) return { code, rest: rest || name.trim() };
  }
  return null;
}

/** Countries found in a group list, largest first; empty when a list isn't country-prefixed. */
export function regionsOf(
  groups: string[],
  countOf: (group: string) => number,
): { code: string; count: number }[] {
  const totals = new Map<string, number>();
  let prefixed = 0;
  for (const group of groups) {
    const region = groupRegion(group);
    if (!region) continue;
    prefixed++;
    totals.set(region.code, (totals.get(region.code) ?? 0) + countOf(group));
  }
  // A list with only a couple of prefixed groups isn't organized by country.
  if (totals.size < 2 || prefixed < 4) return [];
  return Array.from(totals, ([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || (a.code < b.code ? -1 : 1));
}

const CODE_NAMES: Record<string, string> = {
  'EX-YU': 'Ex-Yu', LATAM: 'Latin America', ARAB: 'Arabic', AFRICA: 'Africa', ASIA: 'Asia',
  NORDIC: 'Nordic', CARIBBEAN: 'Caribbean', KURD: 'Kurdish',
};

type DisplayNamesCtor = new (locales: string[], options: { type: 'region' }) => {
  of(code: string): string | undefined;
};

/** A country's name in the UI language where the engine can name it, else its code. */
export function regionName(code: string, locale: string): string {
  if (CODE_NAMES[code]) return CODE_NAMES[code];
  const ctor = (Intl as unknown as { DisplayNames?: DisplayNamesCtor }).DisplayNames;
  if (typeof ctor === 'function' && code.length === 2) {
    try {
      const name = new ctor([locale], { type: 'region' }).of(code);
      if (name && name !== code) return name;
    } catch {
      // An unsupported locale falls back to the code below.
    }
  }
  return code === 'GB' ? 'UK' : code;
}

/** The short chip label: UK for GB, as viewers know it. */
export function regionCode(code: string): string {
  return code === 'GB' ? 'UK' : code;
}
