export const DEFAULT_CHAMPION_POINTS = 5;

/**
 * Champion bet bonus is fixed to 5 points.
 * Older persisted rows may still contain the previous 10-point value,
 * so callers should use this helper instead of trusting stored values directly.
 */
export function getChampionBetPoints() {
  return DEFAULT_CHAMPION_POINTS;
}
