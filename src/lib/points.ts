export interface PointsBreakdown {
  total: number;
  outcome: boolean;
  homeGoals: boolean;
  awayGoals: boolean;
  bothGoals: boolean;
}

/**
 * Calculate points for a single prediction against actual results.
 *
 * Rules:
 * - Correct 1x2 (outcome: home win / draw / away win): 1 pt
 * - Correct home goals: 1 pt
 * - Correct away goals: 1 pt
 * - Both goals correct bonus: +1 pt (on top of the two goal points)
 * Maximum: 4 pts per match
 */
export function calculatePoints(
  predictedHome: number | null | undefined,
  predictedAway: number | null | undefined,
  actualHome: number | null | undefined,
  actualAway: number | null | undefined
): PointsBreakdown {
  const none = { total: 0, outcome: false, homeGoals: false, awayGoals: false, bothGoals: false };

  if (actualHome == null || actualAway == null) return none;

  let total = 0;
  let outcome = false;
  let homeGoals = false;
  let awayGoals = false;
  let bothGoals = false;

  // 1x2 – requires both scores predicted
  if (predictedHome != null && predictedAway != null) {
    const actualSign = Math.sign(actualHome - actualAway);
    const predictedSign = Math.sign(predictedHome - predictedAway);
    if (actualSign === predictedSign) {
      outcome = true;
      total += 1;
    }
  }

  // Home goals
  if (predictedHome != null && predictedHome === actualHome) {
    homeGoals = true;
    total += 1;
  }

  // Away goals
  if (predictedAway != null && predictedAway === actualAway) {
    awayGoals = true;
    total += 1;
  }

  // Both goals bonus
  if (homeGoals && awayGoals) {
    bothGoals = true;
    total += 1;
  }

  return { total, outcome, homeGoals, awayGoals, bothGoals };
}
