/**
 * ダッシュボード・科目一覧で使う、科目ごとの出席/成績計算結果を
 * 一括で取得・計算して返すユーティリティ。
 */
import { getSubjects } from "@/lib/supabase/queries/subjects";
import { getGradeItemsGroupedBySubject } from "@/lib/supabase/queries/gradeItems";
import { getAttendanceSummariesBySubjectIds } from "@/lib/supabase/queries/attendanceRecords";
import { getLatestTestRecordsByGradeItemIds } from "@/lib/supabase/queries/testRecords";
import { calcRemainingAbsences } from "@/lib/calc/attendance";
import { calcRequiredScore } from "@/lib/calc/gradeGoal";
import type { Subject, GradeItem } from "@/lib/types/domain";
import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";

export interface SubjectDashboardData {
  subjects: Subject[];
  gradeItemsMap: Record<string, GradeItem[]>;
  attendanceResults: Record<string, AttendanceCalcResult | null>;
  gradeResults: Record<string, GradeGoalResult | null>;
}

export async function getSubjectDashboardData(): Promise<SubjectDashboardData> {
  const subjects = await getSubjects();

  if (subjects.length === 0) {
    return {
      subjects,
      gradeItemsMap: {},
      attendanceResults: {},
      gradeResults: {},
    };
  }

  const subjectIds = subjects.map((s) => s.id);

  const [gradeItemsMap, attendanceSummaries] = await Promise.all([
    getGradeItemsGroupedBySubject(subjectIds),
    getAttendanceSummariesBySubjectIds(subjectIds),
  ]);

  const allGradeItemIds = Object.values(gradeItemsMap).flatMap((items) =>
    items.map((item) => item.id),
  );
  const latestTestRecords =
    await getLatestTestRecordsByGradeItemIds(allGradeItemIds);

  const attendanceResults: Record<string, AttendanceCalcResult | null> = {};
  const gradeResults: Record<string, GradeGoalResult | null> = {};

  for (const subject of subjects) {
    const gradeItems = gradeItemsMap[subject.id] ?? [];

    // 出席逆算
    if (
      subject.attendanceAffectsGrade &&
      subject.totalClassCount != null &&
      subject.totalClassCount > 0
    ) {
      const summary = attendanceSummaries[subject.id];
      const attendedCount =
        (summary?.presentCount ?? 0) + (summary?.lateCount ?? 0);
      const absentCount = summary?.absentCount ?? 0;

      attendanceResults[subject.id] = calcRemainingAbsences({
        totalClassCount: subject.totalClassCount,
        attendedCount,
        absentCount,
        requiredRate: subject.attendanceRequiredRate,
        maxAbsences: subject.attendanceMaxAbsences,
      });
    } else {
      attendanceResults[subject.id] = null;
    }

    // 成績逆算（反復型は100点換算平均、項目追加型は最新1件）
    if (subject.targetScore != null && gradeItems.length > 0) {
      gradeResults[subject.id] = calcRequiredScore({
        targetScore: subject.targetScore,
        gradeItems: gradeItems.map((item) => {
          const latest = latestTestRecords[item.id];
          const maxScore = item.maxScore ?? 100;
          const currentScore =
            latest != null ? (latest.score / maxScore) * 100 : null;
          return { weight: item.weight, maxScore: 100, currentScore };
        }),
      });
    } else {
      gradeResults[subject.id] = null;
    }
  }

  return { subjects, gradeItemsMap, attendanceResults, gradeResults };
}
