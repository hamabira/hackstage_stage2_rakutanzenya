import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceSummaryCard } from "@/components/subjects/AttendanceSummaryCard";
import { GradeGoalCard } from "@/components/subjects/GradeGoalCard";
import { GradeItemsCard } from "@/components/subjects/GradeItemsCard";
import { Card } from "@/components/ui/Card";
import { summarizeAttendanceRecords } from "@/lib/attendance/attendanceSummary";
import { calcRemainingAbsences } from "@/lib/calc/attendance";
import { calcRequiredScore } from "@/lib/calc/gradeGoal";
import {
  summarizeGradeItemScores,
  toGradeGoalItems,
} from "@/lib/grades/gradeItemScores";
import { getAttendanceRecords } from "@/lib/supabase/queries/attendance";
import { getSubject } from "@/lib/supabase/queries/subjects";
import { getTestRecordsBySubjectId } from "@/lib/supabase/queries/grades";

/** 取得に失敗した記録がある場合に、計算結果が不完全であることを知らせる。 */
function DataErrorNotice({ labels }: { labels: string[] }) {
  return (
    <Card className="border-red-300 bg-red-50">
      <p className="text-sm text-red-700" role="alert">
        {labels.join("と")}の取得に失敗しました。表示中の計算結果は不完全な可能性があります。
        時間をおいて画面を再読み込みしてください。
      </p>
    </Card>
  );
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subjectResult = await getSubject(id);

  // 他ユーザーの科目はRLSにより not_found となるため、存在の有無を区別しない。
  if (!subjectResult.ok) {
    notFound();
  }

  const { subject, gradeItems } = subjectResult;

  const [attendanceResult, testRecordsResult] = await Promise.all([
    getAttendanceRecords(id),
    getTestRecordsBySubjectId(id),
  ]);

  // 記録の取得に失敗しても科目情報は表示する。件数0として計算し、警告を添える。
  const attendanceRecords = attendanceResult.ok ? attendanceResult.records : [];
  const testRecords = testRecordsResult.ok ? testRecordsResult.records : [];

  const failedLabels = [
    ...(attendanceResult.ok ? [] : ["出席記録"]),
    ...(testRecordsResult.ok ? [] : ["得点記録"]),
  ];

  const attendanceSummary = summarizeAttendanceRecords(attendanceRecords);
  const attendanceCalcResult = calcRemainingAbsences({
    // 総授業回数が未登録の場合は計算側が invalid_total_class_count を返す。
    totalClassCount: subject.totalClassCount ?? 0,
    attendedCount: attendanceSummary.attendedCount,
    absentCount: attendanceSummary.absentCount,
    requiredRate: subject.attendanceRequiredRate,
    maxAbsences: subject.attendanceMaxAbsences,
  });

  const gradeItemScores = summarizeGradeItemScores(gradeItems, testRecords);
  const gradeGoalResult = calcRequiredScore({
    gradeItems: toGradeGoalItems(gradeItemScores),
    targetScore: subject.targetScore,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/subjects" className="text-sm underline">
        ← 科目一覧に戻る
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{subject.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href={`/subjects/${id}/edit`} className="underline">
            評価方法を編集
          </Link>
          <Link href={`/subjects/${id}/attendance`} className="underline">
            出席を記録
          </Link>
          <Link href={`/subjects/${id}/tests`} className="underline">
            テスト・課題を記録
          </Link>
        </div>
      </div>

      {failedLabels.length === 0 ? null : <DataErrorNotice labels={failedLabels} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AttendanceSummaryCard
          result={attendanceCalcResult}
          summary={attendanceSummary}
          totalClassCount={subject.totalClassCount}
        />
        <GradeGoalCard result={gradeGoalResult} targetScore={subject.targetScore} />
      </div>

      <GradeItemsCard gradeItemScores={gradeItemScores} />

      <Card>
        <h2 className="font-medium">出席条件</h2>
        <dl className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <dt>必要出席率</dt>
            <dd>
              {subject.attendanceRequiredRate === null
                ? "未設定"
                : `${subject.attendanceRequiredRate}%`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>最大欠席数</dt>
            <dd>
              {subject.attendanceMaxAbsences === null
                ? "未設定"
                : `${subject.attendanceMaxAbsences} 回`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>出席を成績に含める</dt>
            <dd>{subject.attendanceAffectsGrade ? "含める" : "含めない"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>目標成績</dt>
            <dd>{subject.targetGradeLabel ?? "未設定"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
