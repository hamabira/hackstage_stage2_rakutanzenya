import Link from "next/link";
import { AttendanceRiskBadge } from "@/components/ui/AttendanceRiskBadge";
import { Card } from "@/components/ui/Card";
import { GRADE_GOAL_PRESENTATION } from "@/lib/calc/gradeGoalMessages";
import type { GradeGoalStatus } from "@/lib/calc/gradeGoal";
import type { SubjectSummary } from "@/lib/dashboard/subjectSummary";

const GRADE_STYLES: Record<GradeGoalStatus, { badge: string; icon: string }> = {
  achieved: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "✓",
  },
  achievable: {
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: "↗",
  },
  unachievable: {
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    icon: "×",
  },
  unavailable: {
    badge: "border-gray-200 bg-gray-50 text-gray-500",
    icon: "?",
  },
};

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
  const goal = GRADE_GOAL_PRESENTATION[summary.gradeGoal.status];
  const gradeStyle = GRADE_STYLES[summary.gradeGoal.status];

  return (
    <Link
      aria-label={`${summary.subject.name}の詳細を見る`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      href={`/subjects/${summary.subject.id}`}
    >
      <Card className="flex h-full min-h-64 flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:border-[#c8ccc3] group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold">{summary.subject.name}</h3>
              {summary.subject.targetGradeLabel === null ? null : (
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  {summary.subject.targetGradeLabel}
                </span>
              )}
            </div>
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
            <dd>
              <span
                className={`font-display mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-lg font-bold ${gradeStyle.badge}`}
              >
                <span aria-hidden="true">{gradeStyle.icon}</span>
                <span>{getGradeGoalText(summary)}</span>
              </span>
            </dd>
            <dd className={`mt-1 text-xs font-medium ${goal.className}`}>{goal.label}</dd>
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
