export type GenerateSsnMode = 'pre2011' | 'post2011' | 'any' | 'public';

export interface GenerateSsnOptions {
  /**
   * What kind of SSN to generate.
   * - "public" (default): returns one of the publicly-advertised SSNs (intentionally invalid)
   * - "any": may produce either pre2011-valid or post2011-valid
   * - "pre2011": uses stricter pre-2011 area rules
   * - "post2011": uses post-2011 relaxed area rules
   */
  mode?: GenerateSsnMode;

  /**
   * If true, output is digits-only (#########).
   * If false, output is dashed (###-##-####).
   *
   * Default: false
   */
  digitsOnly?: boolean;
}

const PUBLICLY_ADVERTISED = [
  '078-05-1120',
  '721-07-4426',
  '219-09-9999',
] as const;

export function generateSsn(opts: GenerateSsnOptions = {}): string {
  const mode = opts.mode ?? 'public';
  const digitsOnly = opts.digitsOnly ?? false;

  if (mode === 'public') {
    const chosen =
      PUBLICLY_ADVERTISED[randomInt(0, PUBLICLY_ADVERTISED.length - 1)];
    return digitsOnly ? chosen.replace(/-/g, '') : chosen;
  }

  const effectiveMode: Exclude<GenerateSsnMode, 'any' | 'public'> =
    mode === 'any' ? (randomFloat() < 0.5 ? 'pre2011' : 'post2011') : mode;

  while (true) {
    const area = generateArea(effectiveMode); // "001".."899" with constraints
    const group = generateNonZeroFixedWidth(2); // "01".."99"
    const serial = generateNonZeroFixedWidth(4); // "0001".."9999"

    const dashed = `${area}-${group}-${serial}`;

    // Avoid returning publicly advertised SSNs unless explicitly requested.
    if ((PUBLICLY_ADVERTISED as readonly string[]).includes(dashed)) continue;

    return digitsOnly ? dashed.replace(/-/g, '') : dashed;
  }
}

/* ---------------------------- helpers ---------------------------- */

function generateArea(mode: 'pre2011' | 'post2011'): string {
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
    const n = randomInt(1, 899); // 001..899
    if (n === 666) continue;

    if (mode === 'pre2011') {
      if (n >= 734 && n <= 749) continue;
      if (n >= 773) continue; // excludes 773..899
    }

    return pad3(n);
  }
}

function generateNonZeroFixedWidth(width: 2 | 4): string {
  if (width === 2) {
    const n = randomInt(1, 99); // 01..99
    return n.toString().padStart(2, '0');
  }

  const n = randomInt(1, 9999); // 0001..9999
  return n.toString().padStart(4, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

function randomInt(min: number, max: number): number {
  // inclusive min/max
  return Math.floor(randomFloat() * (max - min + 1)) + min;
}

function randomFloat(): number {
  // Prefer crypto when available; fall back to Math.random.
  const g = globalThis;

  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    g.crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }

  return Math.random();
}
