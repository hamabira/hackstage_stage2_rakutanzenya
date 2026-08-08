import Link from "next/link";
import { DashboardFocus } from "@/components/dashboard/DashboardFocus";
import { SubjectSummaryCard } from "@/components/dashboard/SubjectSummaryCard";
import { Card } from "@/components/ui/Card";
import {
  buildSubjectSummaries,
  sortSubjectSummariesByRisk,
} from "@/lib/dashboard/subjectSummary";
import { getDashboardRecords } from "@/lib/supabase/queries/dashboardData";
import { getSubjects } from "@/lib/supabase/queries/subjects";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [subjects, userResult] = await Promise.all([
    getSubjects(),
    supabase.auth.getUser(),
  ]);
  const records = await getDashboardRecords(subjects.map((subject) => subject.id));
  const accountLabel = userResult.data.user?.email ?? "メールアドレス未設定";

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
        <div>
          <p className="text-xs font-semibold text-[#92988f]">{accountLabel}</p>
          <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">今週の状況</h1>
          <p className="mt-1 text-sm text-[#697067]">危険度の高い科目から確認しましょう。</p>
        </div>
        <Link
          className="hidden rounded-full bg-[#72d350] px-5 py-3 text-sm font-bold text-[#20231f] hover:bg-[#64c544] sm:inline-flex"
          href="/subjects/new"
        >
          ＋ 科目を追加
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
        <Card className="flex flex-col items-start gap-3 border-dashed py-10">
          <p className="font-display text-xl font-bold">最初の科目を登録しましょう</p>
          <p className="text-sm text-[#697067]">
            出席条件と評価割合を登録すると、残り欠席回数と必要点数を計算できます。
          </p>
          <Link
            className="mt-2 rounded-full bg-[#72d350] px-5 py-2.5 text-sm font-bold"
            href="/subjects/new"
          >
            科目を追加する
          </Link>
        </Card>
      ) : (
        <>
          <DashboardFocus summaries={summaries} />
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">科目の状況</h2>
              <span className="rounded-full border bg-white px-3 py-2 text-xs font-semibold text-[#697067]">
                危険度順
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {summaries.map((summary) => (
                <SubjectSummaryCard key={summary.subject.id} summary={summary} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
