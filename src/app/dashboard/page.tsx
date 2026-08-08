import Link from "next/link";
import { SubjectSummaryCard } from "@/components/dashboard/SubjectSummaryCard";
import { Card } from "@/components/ui/Card";
import {
  buildSubjectSummaries,
  sortSubjectSummariesByRisk,
} from "@/lib/dashboard/subjectSummary";
import { getDashboardRecords } from "@/lib/supabase/queries/dashboardData";
import { getSubjects } from "@/lib/supabase/queries/subjects";

export default async function DashboardPage() {
  const subjects = await getSubjects();
  const records = await getDashboardRecords(subjects.map((subject) => subject.id));

  const summaries = sortSubjectSummariesByRisk(
    buildSubjectSummaries(
      subjects,
      records.gradeItems,
      records.attendanceRecords,
      records.testRecords,
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <Link href="/subjects/new" className="text-sm underline">
          科目を追加
        </Link>
      </div>

      {records.failedLabels.length === 0 ? null : (
        <Card className="border-red-300 bg-red-50">
          <p className="text-sm text-red-700" role="alert">
            {records.failedLabels.join("と")}
            の取得に失敗しました。表示中の計算結果は不完全な可能性があります。
          </p>
        </Card>
      )}

      {subjects.length === 0 ? (
        <p className="text-sm text-gray-500">
          登録済みの科目はまだありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <SubjectSummaryCard key={summary.subject.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
