export interface GradeGoalInput {
  gradeItems: Array<{
    weight: number;
    maxScore: number | null;
    currentScore: number | null; // 未実施ならnull
  }>;
  targetScore: number; // 0-100換算などの目標
}

export interface GradeGoalResult {
  requiredAverageOnRemaining: number | null;
  isAchievable: boolean;
}

/**
 * 目標成績を達成するために残り評価項目で必要な平均得点率（%）を計算する。
 *
 * - 実施済み項目: (currentScore / maxScore) * weight で加重スコアを積算。
 *   maxScore が null または 0 の項目は計算から除外する。
 * - 未実施項目の合計 weight が 0 の場合は既取得スコアで達成可否を判定。
 * - requiredAverageOnRemaining は 0〜100 の範囲を超えることがある（達成不可の場合）。
 */
export function calcRequiredScore(input: GradeGoalInput): GradeGoalResult {
  const { gradeItems, targetScore } = input;

  let earnedWeightedScore = 0;
  let remainingWeight = 0;

  for (const item of gradeItems) {
    const hasScore = item.currentScore != null;
    const hasScorable = item.maxScore != null && item.maxScore > 0;

    if (hasScore && hasScorable) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      earnedWeightedScore += (item.currentScore! / item.maxScore!) * item.weight;
    } else if (!hasScore) {
      // 未実施項目は残り重みに加算
      remainingWeight += item.weight;
    }
  }

  if (remainingWeight === 0) {
    // 全項目実施済み：現在の加重スコアで達成可否を判定
    return {
      requiredAverageOnRemaining: null,
      isAchievable: earnedWeightedScore >= targetScore,
    };
  }

  // 残り項目で何%取れば目標に届くかを逆算
  const required =
    ((targetScore - earnedWeightedScore) / remainingWeight) * 100;

  return {
    requiredAverageOnRemaining: Math.round(required * 10) / 10,
    isAchievable: required <= 100,
  };
}
