import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";

export type CourseGoalUnachievableReason =
  | "attendance_exceeded"
  | "score_insufficient";

export interface CourseGoalResult extends GradeGoalResult {
  unachievableReason: CourseGoalUnachievableReason | null;
}

interface CourseGoalInput {
  attendance: AttendanceCalcResult;
  gradeGoal: GradeGoalResult;
}

/**
 * 出席条件と点数目標を合わせて、科目としての目標達成可否を判定する。
 * 欠席上限を超えている場合は、点数の状況にかかわらず達成不可能とする。
 */
export function calcCourseGoal({ attendance, gradeGoal }: CourseGoalInput): CourseGoalResult {
  if (attendance.riskLevel === "exceeded") {
    return {
      status: "unachievable",
      requiredAverageOnRemaining: null,
      isAchievable: false,
      calculationError: null,
      unachievableReason: "attendance_exceeded",
    };
  }

  return {
    ...gradeGoal,
    unachievableReason:
      gradeGoal.status === "unachievable" ? "score_insufficient" : null,
  };
}
