export type GenerateSsnMode = 'pre2011' | 'post2011' | 'any' | 'public';

export interface GenerateSsnOptions {
  /**
   * What kind of SSN to generate.
   * - "any" (default): may produce either pre2011-valid or post2011-valid
   * - "pre2011": uses stricter pre-2011 area rules
   * - "post2011": uses post-2011 relaxed area rules
   * - "public": returns one of the publicly-advertised SSNs (intentionally invalid)
   */
  mode?: GenerateSsnMode;

  /** Output format (default: "dashed") */
  format?: 'dashed' | 'digits';

  /**
   * Optional RNG injection for determinism in tests.
   * Must return a float in [0, 1).
   */
  rng?: () => number;

  /**
   * For mode="public": choose a specific advertised SSN, otherwise random.
   */
  publicValue?: '078-05-1120' | '721-07-4426' | '219-09-9999';
}

const PUBLICLY_ADVERTISED = [
  '078-05-1120',
  '721-07-4426',
  '219-09-9999',
] as const;

export function generateSsn(opts: GenerateSsnOptions = {}): string {
  const mode = opts.mode ?? 'any';
  const format = opts.format ?? 'dashed';
  const rng = opts.rng ?? defaultRng;

  if (mode === 'public') {
    const chosen =
      opts.publicValue ??
      PUBLICLY_ADVERTISED[randomInt(rng, 0, PUBLICLY_ADVERTISED.length - 1)];
    return format === 'digits' ? chosen.replace(/-/g, '') : chosen;
  }

  // "any" => randomly choose pre or post
  const effectiveMode: Exclude<GenerateSsnMode, 'any' | 'public'> =
    mode === 'any' ? (rng() < 0.5 ? 'pre2011' : 'post2011') : mode;

  const area = generateArea(effectiveMode, rng);
  const group = generateNonZeroFixedWidth(rng, 2); // 01..99 (not 00)
  const serial = generateNonZeroFixedWidth(rng, 4); // 0001..9999 (not 0000)

  const dashed = `${area}-${group}-${serial}`;

  // Avoid accidentally returning a "publicly advertised" SSN unless explicitly requested.
  if ((PUBLICLY_ADVERTISED as readonly string[]).includes(dashed)) {
    return generateSsn({ ...opts, mode }); // retry (very unlikely)
  }

  return format === 'digits' ? dashed.replace(/-/g, '') : dashed;
}

/* ---------------------------- helpers ---------------------------- */

function generateArea(mode: 'pre2011' | 'post2011', rng: () => number): string {
  // Base rules always:
  // - not 000
  // - not 666
  // - not 900-999
  //
  // Pre-2011 additionally:
  // - not 734-749
  // - not >= 773
  //
  // Strategy: generate until it passes constraints (fast, tiny rejection rate).
  while (true) {
    const n = randomInt(rng, 1, 899); // 001..899
    if (n === 666) continue;

    if (mode === 'pre2011') {
      if (n >= 734 && n <= 749) continue;
      if (n >= 773) continue; // excludes 773..899
    }

    return pad3(n);
  }
}

function generateNonZeroFixedWidth(rng: () => number, width: 2 | 4): string {
  if (width === 2) {
    // 01..99
    const n = randomInt(rng, 1, 99);
    return n.toString().padStart(2, '0');
  }
  // 0001..9999
  const n = randomInt(rng, 1, 9999);
  return n.toString().padStart(4, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

function randomInt(rng: () => number, min: number, max: number): number {
  // inclusive min/max
  const r = rng();
  return Math.floor(r * (max - min + 1)) + min;
}

function defaultRng(): number {
  // Prefer crypto when available; fall back to Math.random.
  // Works in browsers; in Node 19+ crypto.getRandomValues exists on globalThis.crypto.
  const g = globalThis;
  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    g.crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}
