import Link from "next/link";
import { getSubjects } from "@/lib/supabase/queries/subjects";
import { getGradeItemsGroupedBySubject } from "@/lib/supabase/queries/gradeItems";
import { getAttendanceSummariesBySubjectIds } from "@/lib/supabase/queries/attendanceRecords";
import { getLatestTestRecordsByGradeItemIds } from "@/lib/supabase/queries/testRecords";
import { calcRemainingAbsences } from "@/lib/calc/attendance";
import { calcRequiredScore } from "@/lib/calc/gradeGoal";
import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";
import { SubjectsTable } from "@/components/subjects/SubjectsTable";

export default async function SubjectsPage() {
  const subjects = await getSubjects();

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">科目一覧</h1>
          <Link href="/subjects/new" className="text-sm underline">
            科目を追加
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          登録済みの科目はまだありません。
        </p>
      </div>
    );
  }

  const subjectIds = subjects.map((s) => s.id);

  // 並列でデータを取得
  const [gradeItemsMap, attendanceSummaries] = await Promise.all([
    getGradeItemsGroupedBySubject(subjectIds),
    getAttendanceSummariesBySubjectIds(subjectIds),
  ]);

  // 全 grade_item の id を収集して test_records を一括取得
  const allGradeItemIds = Object.values(gradeItemsMap).flatMap((items) =>
    items.map((item) => item.id),
  );
  const latestTestRecords =
    await getLatestTestRecordsByGradeItemIds(allGradeItemIds);

  // 科目ごとに計算結果を作成
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

    // 成績逆算
    if (subject.targetScore != null && gradeItems.length > 0) {
      gradeResults[subject.id] = calcRequiredScore({
        targetScore: subject.targetScore,
        gradeItems: gradeItems.map((item) => ({
          weight: item.weight,
          maxScore: item.maxScore,
          currentScore: latestTestRecords[item.id]?.score ?? null,
        })),
      });
    } else {
      gradeResults[subject.id] = null;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">科目一覧</h1>
        <Link href="/subjects/new" className="text-sm underline">
          科目を追加
        </Link>
      </div>

      <SubjectsTable
        subjects={subjects}
        gradeItemsMap={gradeItemsMap}
        attendanceResults={attendanceResults}
        gradeResults={gradeResults}
      />
    </div>
  );
}
