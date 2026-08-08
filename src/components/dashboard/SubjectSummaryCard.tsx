import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AttendanceRiskBadge } from "@/components/ui/AttendanceRiskBadge";
import type { SubjectSummary } from "@/lib/dashboard/subjectSummary";

/** 残り欠席回数を一行で表す。計算できない場合は理由ではなく促し文を出す。 */
function getAttendanceText(summary: SubjectSummary): string {
  const { remainingAllowedAbsences } = summary.attendance;

  if (remainingAllowedAbsences === null) {
    return "出席条件が未設定";
  }

  return remainingAllowedAbsences < 0
    ? `${Math.abs(remainingAllowedAbsences)}回 超過`
    : `あと ${remainingAllowedAbsences} 回`;
}

/** 目標までの状況を一行で表す。 */
function getGradeGoalText(summary: SubjectSummary): string {
  const { status, requiredAverageOnRemaining } = summary.gradeGoal;

  if (status === "achieved") {
    return "目標達成済み";
  }

  if (status === "unachievable") {
    return "目標達成は不可能";
  }

  if (requiredAverageOnRemaining === null) {
    return "目標が未設定";
  }

  return `平均 ${requiredAverageOnRemaining} 点`;
}

/** ダッシュボードで科目ごとの逆算結果を要約するカード。 */
export function SubjectSummaryCard({ summary }: { summary: SubjectSummary }) {
  return (
    <Link className="group block h-full" href={`/subjects/${summary.subject.id}`}>
      <Card className="flex h-full min-h-64 flex-col p-5 group-hover:-translate-y-0.5 group-hover:border-[#c8ccc3] group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold">{summary.subject.name}</h3>
            <p className="mt-1 text-xs text-[#92988f]">
              {summary.recordedCount} / {summary.subject.totalClassCount ?? "?"}回 記録済み
            </p>
          </div>
          <AttendanceRiskBadge riskLevel={summary.attendance.riskLevel} />
        </div>

        <dl className="mt-7 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-[#697067]">あと何回休める？</dt>
            <dd className="font-display mt-2 text-xl font-bold text-[#20231f]">
              {getAttendanceText(summary)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#697067]">目標まで</dt>
            <dd className="font-display mt-2 text-lg font-bold text-[#20231f]">
              {getGradeGoalText(summary)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-end justify-between gap-3 pt-7 text-xs">
          <p className="text-[#92988f]">
            出席率 {summary.attendance.currentAttendanceRate === null
              ? "記録なし"
              : `${summary.attendance.currentAttendanceRate}%`}
          </p>
          <span className="font-bold text-[#337a24]">詳しく見る →</span>
        </div>
      </Card>
    </Link>
  );
}
