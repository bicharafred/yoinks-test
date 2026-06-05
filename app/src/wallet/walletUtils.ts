/**
 * Decimal math for transferable → Yoinks intentionally matches legacy rounding:
 * Math.floor(transferable / {@link LEGACY_TRANSFERABLE_PER_YOINK}).
 *
 * Preserve until backend confirms `transferable` unit semantics (plan Step 10+).
 */
export const LEGACY_TRANSFERABLE_PER_YOINK = 0.05;

export function convertTransferableToYoinks(transferable: number): number {
  if (!Number.isFinite(transferable)) {
    return 0;
  }
  return Math.round(transferable / LEGACY_TRANSFERABLE_PER_YOINK);
}

/** Legacy surfaced redeemable formatting: two decimal places (`redeemable.toFixed(2)`). */
export function formatRedeemableBalance(redeemable: number): string {
  if (!Number.isFinite(redeemable)) return "0.00";
  return redeemable.toFixed(2);
}

/**
 * Figma-aligned pack price copy (e.g. `USD4.99`): ISO currency letters + fixed major units.
 */
export function formatOfferingPrice(
  amountInCents: number,
  currencyCode: string,
): string {
  const code = currencyCode.trim().length > 0 ? currencyCode.trim() : "USD";
  const major = Number.isFinite(amountInCents) ? amountInCents / 100 : 0;
  const clipped = Number.isFinite(major) ? Math.max(0, major) : 0;
  return `${code.toUpperCase()}${clipped.toFixed(2)}`;
}
