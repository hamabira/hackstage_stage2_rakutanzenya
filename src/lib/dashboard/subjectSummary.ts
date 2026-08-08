import { summarizeAttendanceRecords } from "@/lib/attendance/attendanceSummary";
import {
  calcRemainingAbsences,
  type AttendanceCalcResult,
  type AttendanceRiskLevel,
} from "@/lib/calc/attendance";
import { calcRequiredScore, type GradeGoalResult } from "@/lib/calc/gradeGoal";
import {
  summarizeGradeItemScores,
  toGradeGoalItems,
} from "@/lib/grades/gradeItemScores";
import type {
  AttendanceRecord,
  GradeItem,
  Subject,
  TestRecord,
} from "@/lib/types/domain";

export interface SubjectSummary {
  subject: Subject;
  attendance: AttendanceCalcResult;
  gradeGoal: GradeGoalResult;
  /** 出席として数えた回数と欠席回数の合計。 */
  recordedCount: number;
}

/** 危険度の高い順。数値が小さいほど優先して表示する。 */
const RISK_PRIORITY: Record<AttendanceRiskLevel, number> = {
  exceeded: 0,
  danger: 1,
  caution: 2,
  on_track: 3,
  unavailable: 4,
};

/** 科目ごとに出席・目標の計算結果を組み立てる。 */
export function buildSubjectSummaries(
  subjects: Subject[],
  gradeItems: GradeItem[],
  attendanceRecords: AttendanceRecord[],
  testRecords: TestRecord[],
): SubjectSummary[] {
  return subjects.map((subject) => {
    const subjectGradeItems = gradeItems.filter(
      (gradeItem) => gradeItem.subjectId === subject.id,
    );
    const subjectAttendance = attendanceRecords.filter(
      (record) => record.subjectId === subject.id,
    );

    const attendanceSummary = summarizeAttendanceRecords(subjectAttendance);
    const gradeItemScores = summarizeGradeItemScores(subjectGradeItems, testRecords);

    return {
      subject,
      // 計算不能な科目も unavailable として返るため、1科目の失敗が他へ波及しない。
      attendance: calcRemainingAbsences({
        totalClassCount: subject.totalClassCount ?? 0,
        attendedCount: attendanceSummary.attendedCount,
        absentCount: attendanceSummary.absentCount,
        requiredRate: subject.attendanceRequiredRate,
        maxAbsences: subject.attendanceMaxAbsences,
      }),
      gradeGoal: calcRequiredScore({
        gradeItems: toGradeGoalItems(gradeItemScores),
        targetScore: subject.targetScore,
      }),
      recordedCount: attendanceSummary.recordedCount,
    };
  });
}

/**
 * 危険度の高い科目を先頭に並べる。
 * 同じ危険度の中では、残り欠席回数が少ない科目を優先する。
 * 元の並び(作成日順)は最後の比較キーとして保つ。
 */
export function sortSubjectSummariesByRisk(
  summaries: SubjectSummary[],
): SubjectSummary[] {
  return [...summaries].sort((first, second) => {
    const priorityDiff =
      RISK_PRIORITY[first.attendance.riskLevel] -
      RISK_PRIORITY[second.attendance.riskLevel];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const firstRemaining = first.attendance.remainingAllowedAbsences;
    const secondRemaining = second.attendance.remainingAllowedAbsences;

    if (firstRemaining !== null && secondRemaining !== null) {
      return firstRemaining - secondRemaining;
    }

    return 0;
  });
}
