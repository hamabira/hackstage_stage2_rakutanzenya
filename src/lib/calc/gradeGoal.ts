export interface GradeGoalInput {
  gradeItems: Array<{
    weight: number;
    maxScore: number | null;
    currentScore: number | null;
  }>;
  targetScore: number | null;
}

export type GradeGoalStatus = "achieved" | "achievable" | "unachievable" | "unavailable";

export type GradeGoalCalculationError =
  | "missing_target_score"
  | "invalid_target_score"
  | "missing_grade_items"
  | "invalid_grade_item_weight"
  | "invalid_weight_total"
  | "missing_max_score"
  | "invalid_max_score"
  | "invalid_current_score";

export interface GradeGoalResult {
  status: GradeGoalStatus;
  requiredAverageOnRemaining: number | null;
  isAchievable: boolean | null;
  calculationError: GradeGoalCalculationError | null;
}

const WEIGHT_TOTAL = 100;
const NUMBER_TOLERANCE = 0.000001;
const SCORE_DECIMAL_PLACES = 2;

/** 計算不能の理由と、画面で確定値として表示しない結果を作成する。 */
function createUnavailableResult(calculationError: GradeGoalCalculationError): GradeGoalResult {
  return {
    status: "unavailable",
    requiredAverageOnRemaining: null,
    isAchievable: null,
    calculationError,
  };
}

/** 数値が有限で、DBで扱う小数第2位までに収まるかを確認する。 */
function hasValidScorePrecision(value: number): boolean {
  const scaled = value * 10 ** SCORE_DECIMAL_PLACES;
  return Math.abs(scaled - Math.round(scaled)) < NUMBER_TOLERANCE;
}

/** 画面表示用に必要平均点を小数第1位へ丸める。 */
function roundToOneDecimal(value: number): number {
  return Math.round((value + NUMBER_TOLERANCE) * 10) / 10;
}

/** 評価項目・目標点数が計算に使える値かを確認し、不正なら理由を返す。 */
function getCalculationError(input: GradeGoalInput): GradeGoalCalculationError | null {
  const { gradeItems, targetScore } = input;

  if (targetScore === null || targetScore === undefined) {
    return "missing_target_score";
  }

  if (
    !Number.isFinite(targetScore) ||
    targetScore < 0 ||
    targetScore > WEIGHT_TOTAL ||
    !hasValidScorePrecision(targetScore)
  ) {
    return "invalid_target_score";
  }

  if (!gradeItems || gradeItems.length === 0) {
    return "missing_grade_items";
  }

  let weightTotal = 0;

  for (const item of gradeItems) {
    if (!Number.isFinite(item.weight) || item.weight < 0 || item.weight > WEIGHT_TOTAL) {
      return "invalid_grade_item_weight";
    }

    weightTotal += item.weight;

    if (item.maxScore === null || item.maxScore === undefined) {
      return "missing_max_score";
    }

    if (!Number.isFinite(item.maxScore) || item.maxScore <= 0 || !hasValidScorePrecision(item.maxScore)) {
      return "invalid_max_score";
    }

    if (
      item.currentScore !== null &&
      item.currentScore !== undefined &&
      (!Number.isFinite(item.currentScore) ||
        item.currentScore < 0 ||
        item.currentScore > item.maxScore ||
        !hasValidScorePrecision(item.currentScore))
    ) {
      return "invalid_current_score";
    }
  }

  if (Math.abs(weightTotal - WEIGHT_TOTAL) >= NUMBER_TOLERANCE) {
    return "invalid_weight_total";
  }

  return null;
}

/** 目標点数を満たすために残り評価項目で必要な100点換算平均を計算する。 */
export function calcRequiredScore(input: GradeGoalInput): GradeGoalResult {
  const calculationError = getCalculationError(input);
  if (calculationError) {
    return createUnavailableResult(calculationError);
  }

  // getCalculationErrorでnullを除外済みだが、以降の計算用に型も確定させる。
  const targetScore = input.targetScore;
  if (targetScore === null || targetScore === undefined) {
    return createUnavailableResult("missing_target_score");
  }

  let achievedWeightedScore = 0;
  let remainingWeight = 0;

  for (const item of input.gradeItems) {
    // getCalculationErrorで満点のnull・不正値を除外済み。
    const maxScore = item.maxScore as number;

    if (item.currentScore === null || item.currentScore === undefined) {
      remainingWeight += item.weight;
      continue;
    }

    achievedWeightedScore += (item.currentScore / maxScore) * item.weight;
  }

  const neededWeightedScore = targetScore - achievedWeightedScore;

  if (neededWeightedScore <= NUMBER_TOLERANCE) {
    return {
      status: "achieved",
      requiredAverageOnRemaining: null,
      isAchievable: true,
      calculationError: null,
    };
  }

  if (remainingWeight <= NUMBER_TOLERANCE) {
    return {
      status: "unachievable",
      requiredAverageOnRemaining: null,
      isAchievable: false,
      calculationError: null,
    };
  }

  const requiredAverageOnRemaining = (neededWeightedScore / remainingWeight) * WEIGHT_TOTAL;

  if (requiredAverageOnRemaining > WEIGHT_TOTAL + NUMBER_TOLERANCE) {
    return {
      status: "unachievable",
      requiredAverageOnRemaining: null,
      isAchievable: false,
      calculationError: null,
    };
  }

  return {
    status: "achievable",
    requiredAverageOnRemaining: roundToOneDecimal(requiredAverageOnRemaining),
    isAchievable: true,
    calculationError: null,
  };
}
