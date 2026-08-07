export interface AttendanceCalcInput {
  totalClassCount: number;
  attendedCount: number;
  absentCount: number;
  requiredRate: number | null;
  maxAbsences: number | null;
}

export interface AttendanceCalcResult {
  remainingAllowedAbsences: number | null;
  currentAttendanceRate: number;
  isAtRisk: boolean;
}

/**
 * 残り許容欠席数を計算する。
 *
 * - `maxAbsences` が設定されている場合はそれを上限とする。
 * - `requiredRate` が設定されている場合は出席率から上限を算出する。
 * - 両方設定されている場合は、より厳しい（小さい）方を採用する。
 * - isAtRisk は残り許容欠席数が 2 回以下のとき true。
 */
export function calcRemainingAbsences(
  input: AttendanceCalcInput,
): AttendanceCalcResult {
  const { totalClassCount, attendedCount, absentCount, requiredRate, maxAbsences } =
    input;

  const currentAttendanceRate =
    totalClassCount > 0 ? attendedCount / totalClassCount : 0;

  let remainingAllowedAbsences: number | null = null;

  if (maxAbsences != null) {
    remainingAllowedAbsences = maxAbsences - absentCount;
  }

  if (requiredRate != null) {
    // 出席率から最大許容欠席数を逆算（floor で切り捨て）
    const maxAllowedByRate = Math.floor(
      totalClassCount * (1 - requiredRate / 100),
    );
    const remainingByRate = maxAllowedByRate - absentCount;
    // より厳しい方を採用
    remainingAllowedAbsences =
      remainingAllowedAbsences == null
        ? remainingByRate
        : Math.min(remainingAllowedAbsences, remainingByRate);
  }

  const isAtRisk =
    remainingAllowedAbsences != null && remainingAllowedAbsences <= 2;

  return { remainingAllowedAbsences, currentAttendanceRate, isAtRisk };
}
