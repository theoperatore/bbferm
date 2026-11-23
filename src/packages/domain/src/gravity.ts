/**
 * Approximate ABV from original and final specific gravity
 * using the standard homebrewing formula.
 */
export function abvFromGravity(og: number, fg: number) {
  return (og - fg) * 131.25;
}

/** Apparent attenuation as a fraction between 0 and 1. */
export function apparentAttenuation(og: number, fg: number) {
  if (og <= 1) return 0;
  return (og - fg) / (og - 1);
}
