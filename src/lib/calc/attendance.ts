export interface AttendanceCalcInput {
  totalClassCount: number;
  attendedCount: number;
  absentCount: number;
  requiredRate: number | null;
  maxAbsences: number | null;
}

export type AttendanceRiskLevel =
  | "on_track"
  | "caution"
  | "danger"
  | "exceeded"
  | "unavailable";

export type AttendanceCalculationError =
  | "invalid_total_class_count"
  | "invalid_attended_count"
  | "invalid_absent_count"
  | "recorded_count_exceeds_total"
  | "invalid_required_rate"
  | "invalid_max_absences"
  | "missing_attendance_condition";

export interface AttendanceCalcResult {
  remainingAllowedAbsences: number | null;
  currentAttendanceRate: number | null;
  riskLevel: AttendanceRiskLevel;
  calculationError: AttendanceCalculationError | null;
  isAtRisk: boolean;
}

/**
 * 計算できない場合の返り値を生成する。
 * 現在出席率だけ算出可能な場合は、その値を保持する。
 */
function createUnavailableResult(
  calculationError: AttendanceCalculationError,
  currentAttendanceRate: number | null = null,
): AttendanceCalcResult {
  return {
    remainingAllowedAbsences: null,
    currentAttendanceRate,
    riskLevel: "unavailable",
    calculationError,
    isAtRisk: false,
  };
}

/**
 * 残り許容欠席数を画面表示用の危険度へ変換する。
 */
function getRiskLevel(remainingAllowedAbsences: number): AttendanceRiskLevel {
  if (remainingAllowedAbsences < 0) {
    return "exceeded";
  }

  if (remainingAllowedAbsences === 0) {
    return "danger";
  }

  if (remainingAllowedAbsences === 1) {
    return "caution";
  }

  return "on_track";
}

/**
 * 出席条件から現在の出席率と残り許容欠席数を計算する。
 * 必要出席率は0〜100の百分率で受け取る。
 */
export function calcRemainingAbsences(
  input: AttendanceCalcInput,
): AttendanceCalcResult {
  const { totalClassCount, attendedCount, absentCount, requiredRate, maxAbsences } = input;

  // 授業回数・出席数・欠席数が計算に使える整数かを確認する。
  if (!Number.isInteger(totalClassCount) || totalClassCount <= 0) {
    return createUnavailableResult("invalid_total_class_count");
  }

  if (!Number.isInteger(attendedCount) || attendedCount < 0) {
    return createUnavailableResult("invalid_attended_count");
  }

  if (!Number.isInteger(absentCount) || absentCount < 0) {
    return createUnavailableResult("invalid_absent_count");
  }

  const recordedClassCount = attendedCount + absentCount;
  if (recordedClassCount > totalClassCount) {
    return createUnavailableResult("recorded_count_exceeds_total");
  }

  // 出席条件がDB・フォームの想定する範囲内かを確認する。
  if (requiredRate !== null && (!Number.isFinite(requiredRate) || requiredRate < 0 || requiredRate > 100)) {
    return createUnavailableResult("invalid_required_rate");
  }

  if (
    maxAbsences !== null &&
    (!Number.isInteger(maxAbsences) || maxAbsences < 0 || maxAbsences > totalClassCount)
  ) {
    return createUnavailableResult("invalid_max_absences");
  }

  // 記録がある場合だけ、現在までの出席率を小数第1位まで算出する。
  const currentAttendanceRate =
    recordedClassCount === 0
      ? null
      : Math.round((attendedCount / recordedClassCount) * 100 * 10) / 10;

  if (requiredRate === null && maxAbsences === null) {
    return createUnavailableResult(
      "missing_attendance_condition",
      currentAttendanceRate,
    );
  }

  // 必要出席率から、学期全体で許容される最大欠席数を求める。
  const maxAbsencesFromRate =
    requiredRate === null
      ? null
      : totalClassCount - Math.ceil((totalClassCount * requiredRate) / 100);

  // 両方の出席条件がある場合は、より厳しい（小さい）欠席上限を採用する。
  const allowedAbsences =
    maxAbsencesFromRate === null
      ? maxAbsences
      : maxAbsences === null
        ? maxAbsencesFromRate
        : Math.min(maxAbsencesFromRate, maxAbsences);

  if (allowedAbsences === null) {
    return createUnavailableResult(
      "missing_attendance_condition",
      currentAttendanceRate,
    );
  }

  // 既に欠席した回数を差し引き、残り回数と危険度を決定する。
  const remainingAllowedAbsences = allowedAbsences - absentCount;
  const riskLevel = getRiskLevel(remainingAllowedAbsences);

  return {
    remainingAllowedAbsences,
    currentAttendanceRate,
    riskLevel,
    calculationError: null,
    isAtRisk: riskLevel === "caution" || riskLevel === "danger" || riskLevel === "exceeded",
  };
}
