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

// 不明項目が一変数の場合の目標逆算
export function calcRequiredScore(input: GradeGoalInput): GradeGoalResult {
  const { gradeItems, targetScore } = input;

  // 評価項目が存在しない場合
  if (!gradeItems || gradeItems.length === 0) {
    return {
      requiredAverageOnRemaining: null,
      isAchievable: targetScore <= 0,
    };
  }

  let achievedWeightedScore = 0;
  let remainingWeight = 0;

  // 確定済みスコアの集計と未完了項目の重み計算
  for (const item of gradeItems) {
    const weight = item.weight;
    const maxScore = item.maxScore ?? 100;

    if (item.currentScore !== null && item.currentScore !== undefined) {
      // 確定項目: (獲得スコア / 満点) * 配点重み
      const scoreRate = maxScore > 0 ? item.currentScore / maxScore : 0;
      achievedWeightedScore += scoreRate * weight;
    } else {
      // 未完了項目（一変数）: 残りの配点重みを加算
      remainingWeight += weight;
    }
  }

  // 不足ポイントの計算
  const neededWeightedScore = targetScore - achievedWeightedScore;

  // すでに確定スコアのみで目標達成済みの場合
  if (neededWeightedScore <= 0) {
    return {
      requiredAverageOnRemaining: 0,
      isAchievable: true,
    };
  }

  // 未完了項目が残っていない場合（未達確定）
  if (remainingWeight <= 0) {
    return {
      requiredAverageOnRemaining: null,
      isAchievable: false,
    };
  }

  // 残り未完了項目（一変数）に必要な得点率 (%) と到達判定の算出
  const requiredRate = (neededWeightedScore / remainingWeight) * 100;
  const requiredAverageOnRemaining = Math.round(requiredRate * 10) / 10;
  const isAchievable = requiredRate <= 100;

  return {
    requiredAverageOnRemaining,
    isAchievable,
  };
}
