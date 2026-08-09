import Link from "next/link";
import { AttendanceRiskBadge } from "@/components/ui/AttendanceRiskBadge";
import type { SubjectSummary } from "@/lib/dashboard/subjectSummary";

function requiresAction(summary: SubjectSummary): boolean {
  return (
    summary.attendance.riskLevel === "exceeded" ||
    summary.attendance.riskLevel === "danger" ||
    summary.attendance.riskLevel === "caution" ||
    summary.gradeGoal.status === "unachievable"
  );
}

function getActionDetail(summary: SubjectSummary): string {
  const remaining = summary.attendance.remainingAllowedAbsences;

  if (summary.gradeGoal.unachievableReason === "attendance_exceeded") {
    return "出席条件を満たせないため、目標達成は不可能です";
  }

  if (remaining !== null && remaining <= 1) {
    return remaining < 0
      ? `欠席上限を${Math.abs(remaining)}回超過しています`
      : `欠席できるのはあと${remaining}回です`;
  }

  if (summary.gradeGoal.status === "unachievable") {
    return "現在の記録では目標点へ到達できません";
  }

  return "設定と記録を確認してください";
}

/** 危険度の高い科目を、次に行う操作と一緒に最大2件提示する。 */
export function DashboardFocus({ summaries }: { summaries: SubjectSummary[] }) {
  const actions = summaries.filter(requiresAction).slice(0, 2);

  if (actions.length === 0) {
    return (
      <section className="rounded-xl border border-[#cfe7c6] bg-[#edf7e9] p-5">
        <p className="text-xs font-bold text-[#337a24]">現在の状況</p>
        <h2 className="font-display mt-2 text-xl font-bold">今すぐ対応が必要な科目はありません</h2>
        <p className="mt-1 text-sm text-[#5e655b]">授業後に記録を追加すると、最新の状態を保てます。</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#f3d6a0] bg-[#fff8ea] p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:items-stretch">
        <div className="flex flex-col justify-center">
          <p className="w-fit rounded-full bg-[#fde7bc] px-2.5 py-1 text-xs font-bold text-[#b86f00]">
            今日の優先
          </p>
          <h2 className="font-display mt-3 text-2xl font-bold leading-tight">
            先に手を打つ科目が{actions.length}つあります
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((summary) => (
            <article className="rounded-lg bg-white p-4" key={summary.subject.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{summary.subject.name}</h3>
                <AttendanceRiskBadge riskLevel={summary.attendance.riskLevel} />
              </div>
              <p className="font-display mt-3 text-lg font-bold">
                {getActionDetail(summary)}
              </p>
              <Link
                className="mt-3 inline-block text-sm font-bold text-[#337a24] hover:text-[#245a19]"
                href={`/subjects/${summary.subject.id}`}
              >
                詳細を確認する →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
