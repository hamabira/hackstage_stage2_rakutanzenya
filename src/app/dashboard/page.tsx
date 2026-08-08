import Link from "next/link";
import { getSubjectDashboardData } from "@/lib/supabase/queries/subjectDashboard";
import { SubjectSummaryCard } from "@/components/dashboard/SubjectSummaryCard";

export default async function DashboardPage() {
  const { subjects, gradeItemsMap, attendanceResults, gradeResults } =
    await getSubjectDashboardData();

  // 注意が必要な科目数（isAtRisk または達成困難）
  const alertCount = subjects.filter((s) => {
    const att = attendanceResults[s.id];
    const grd = gradeResults[s.id];
    return (att?.isAtRisk ?? false) || (grd !== null && grd !== undefined && !grd.isAchievable);
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <Link
          href="/subjects/new"
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white"
        >
          科目を追加
        </Link>
      </div>

      {/* 注意バナー */}
      {alertCount > 0 && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
        >
          <span aria-hidden="true" className="text-base">⚠</span>
          <span>
            <strong>{alertCount} 科目</strong>で注意が必要な状況です
          </span>
        </div>
      )}

      {/* 科目なし */}
      {subjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-8 py-12 text-center">
          <p className="text-base font-medium text-gray-700">
            まだ科目が登録されていません
          </p>
          <p className="mt-1 text-sm text-gray-500">
            科目を追加すると、出席状況と成績の目標達成状況をここで確認できます。
          </p>
          <Link
            href="/subjects/new"
            className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            最初の科目を追加する
          </Link>
        </div>
      )}

      {/* カードグリッド */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectSummaryCard
              key={subject.id}
              subject={subject}
              gradeItems={gradeItemsMap[subject.id] ?? []}
              attendanceResult={attendanceResults[subject.id] ?? null}
              gradeResult={gradeResults[subject.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
