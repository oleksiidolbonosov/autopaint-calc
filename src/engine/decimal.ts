/**
 * Deterministic fixed-point decimal arithmetic using BigInt (scale = 10^6).
 * Prevents IEEE-754 floating point rounding errors in financial calculations.
 */

const SCALE_DIGITS = 6;
const SCALE = 1_000_000n;
const HALF_SCALE = 500_000n;

/**
 * Parses a number or numeric string into a BigInt scaled by 10^6.
 */
export function toScaled(value: number | string): bigint {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0n;
    // Use fixed string with extra precision to avoid binary float artifacts like 1.005 * 100
    return parseDecimalString(value.toFixed(SCALE_DIGITS));
  }
  return parseDecimalString(value);
}

function parseDecimalString(raw: string): bigint {
  const trimmed = raw.trim();
  if (!trimmed) return 0n;
  const negative = trimmed.startsWith('-');
  const unsigned = negative || trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  const [intPartRaw, fracPartRaw = ''] = unsigned.split('.');
  const intDigits = intPartRaw.replace(/\D/g, '') || '0';
  const fracDigits = fracPartRaw.replace(/\D/g, '').padEnd(SCALE_DIGITS, '0').slice(0, SCALE_DIGITS);
  const combined = BigInt(intDigits) * SCALE + BigInt(fracDigits);
  return negative ? -combined : combined;
}

/**
 * Converts a scaled BigInt back to a JS number rounded to `decimals` (default 2).
 */
export function fromScaled(scaled: bigint, decimals = 2): number {
  const factor = 10n ** BigInt(SCALE_DIGITS - decimals);
  const rounded = divRoundHalfUp(scaled, factor);
  const num = Number(rounded) / Math.pow(10, decimals);
  return Object.is(num, -0) ? 0 : num;
}

export function roundMoney(value: number): number {
  return fromScaled(toScaled(value), 2);
}

export function roundQuantity(value: number, decimals = 3): number {
  return fromScaled(toScaled(value), decimals);
}

export function addScaled(a: bigint, b: bigint): bigint {
  return a + b;
}

export function subScaled(a: bigint, b: bigint): bigint {
  return a - b;
}

export function mulScaled(a: bigint, b: bigint): bigint {
  return divRoundHalfUp(a * b, SCALE);
}

export function divScaled(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n;
  return divRoundHalfUp(a * SCALE, b);
}

/**
 * Half-up rounding division for positive and negative BigInts.
 */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  const negative = (numerator < 0n) !== (denominator < 0n);
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  const quotient = absNum / absDen;
  const remainder = absNum % absDen;
  const shouldRoundUp = remainder * 2n >= absDen;
  const rounded = shouldRoundUp ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function mulMoney(a: number, b: number): number {
  return fromScaled(mulScaled(toScaled(a), toScaled(b)), 2);
}

export function addMoney(a: number, b: number): number {
  return fromScaled(addScaled(toScaled(a), toScaled(b)), 2);
}

export function subMoney(a: number, b: number): number {
  return fromScaled(subScaled(toScaled(a), toScaled(b)), 2);
}

export function percentOfMoney(baseAmount: number, percent: number): number {
  const scaledBase = toScaled(baseAmount);
  const scaledPct = divScaled(toScaled(percent), toScaled(100));
  return fromScaled(mulScaled(scaledBase, scaledPct), 2);
}

export { HALF_SCALE };
