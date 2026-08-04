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
  throw new Error("not implemented");
}
