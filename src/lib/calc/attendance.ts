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

// TODO: 実装は後続issueで行う(出席計算ロジック実装issue)
export function calcRemainingAbsences(
  input: AttendanceCalcInput,
): AttendanceCalcResult {
  const { totalClassCount, attendedCount, absentCount, requiredRate, maxAbsences } = input;

  // 1. 現在の出席率を計算 (0〜100%)
  const currentTotal = attendedCount + absentCount;
  const currentAttendanceRate =
    currentTotal > 0
      ? Math.round((attendedCount / currentTotal) * 100 * 10) / 10
      : 100;

  // 2. 許容最大欠席数を算出
  let calculatedMaxAbsences: number | null = null;

  if (maxAbsences !== null && maxAbsences !== undefined) {
    calculatedMaxAbsences = maxAbsences;
  }

  if (requiredRate !== null && requiredRate !== undefined && totalClassCount > 0) {
    const rate = requiredRate > 1 ? requiredRate / 100 : requiredRate;
    const minAttendedRequired = Math.ceil(totalClassCount * rate);
    const maxAllowedFromRate = Math.max(0, totalClassCount - minAttendedRequired);

    if (calculatedMaxAbsences === null) {
      calculatedMaxAbsences = maxAllowedFromRate;
    } else {
      // 両方指定されている場合はより厳しい(小さい)方を採用
      calculatedMaxAbsences = Math.min(calculatedMaxAbsences, maxAllowedFromRate);
    }
  }

  // 3. 残り許容欠席数の計算
  const remainingAllowedAbsences =
    calculatedMaxAbsences !== null
      ? calculatedMaxAbsences - absentCount
      : null;

  // 4. 危険判定 (残り欠席可能回数が 1回以下、またはすでに上限オーバーの場合)
  const isAtRisk =
    remainingAllowedAbsences !== null ? remainingAllowedAbsences <= 1 : false;

  return {
    remainingAllowedAbsences,
    currentAttendanceRate,
    isAtRisk,
  };
}
