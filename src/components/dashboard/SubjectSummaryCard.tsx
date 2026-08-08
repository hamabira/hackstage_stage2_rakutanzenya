import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ATTENDANCE_RISK_PRESENTATION } from "@/lib/calc/attendanceMessages";
import { GRADE_GOAL_PRESENTATION } from "@/lib/calc/gradeGoalMessages";
import type { AttendanceRiskLevel } from "@/lib/calc/attendance";
import type { GradeGoalStatus } from "@/lib/calc/gradeGoal";
import type { SubjectSummary } from "@/lib/dashboard/subjectSummary";

const ATTENDANCE_STYLES: Record<
  AttendanceRiskLevel,
  { accent: string; badge: string; icon: string }
> = {
  on_track: {
    accent: "border-l-emerald-400",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "✓",
  },
  caution: {
    accent: "border-l-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "!",
  },
  danger: {
    accent: "border-l-red-400",
    badge: "border-red-200 bg-red-50 text-red-700",
    icon: "!!",
  },
  exceeded: {
    accent: "border-l-red-500",
    badge: "border-red-300 bg-red-100 text-red-800",
    icon: "×",
  },
  unavailable: {
    accent: "border-l-gray-300",
    badge: "border-gray-200 bg-gray-50 text-gray-500",
    icon: "?",
  },
};

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
  const risk = ATTENDANCE_RISK_PRESENTATION[summary.attendance.riskLevel];
  const goal = GRADE_GOAL_PRESENTATION[summary.gradeGoal.status];
  const attendanceStyle = ATTENDANCE_STYLES[summary.attendance.riskLevel];
  const gradeStyle = GRADE_STYLES[summary.gradeGoal.status];

  return (
    <Link
      href={`/subjects/${summary.subject.id}`}
      aria-label={`${summary.subject.name}の詳細を見る`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <Card
        className={`h-full rounded-xl border-l-4 bg-white transition group-hover:-translate-y-0.5 group-hover:shadow-md ${attendanceStyle.accent}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-gray-900">
            {summary.subject.name}
          </h3>
          {summary.subject.targetGradeLabel === null ? null : (
            <span className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
              {summary.subject.targetGradeLabel}
            </span>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex min-w-0 flex-col gap-1 pr-3">
            <dt className="text-xs text-gray-500">あと休める回数</dt>
            <dd>
              <span
                className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 font-bold ${attendanceStyle.badge}`}
              >
                <span aria-hidden="true">{attendanceStyle.icon}</span>
                <span>{getAttendanceText(summary)}</span>
              </span>
            </dd>
            <dd className={`text-xs font-medium ${risk.className}`}>
              {risk.label}
              {summary.attendance.currentAttendanceRate === null
                ? ""
                : ` · 出席率 ${summary.attendance.currentAttendanceRate}%`}
            </dd>
          </div>

          <div className="flex min-w-0 flex-col gap-1 border-l border-gray-200 pl-3">
            <dt className="text-xs text-gray-500">必要平均点</dt>
            <dd>
              <span
                className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 font-bold ${gradeStyle.badge}`}
              >
                <span aria-hidden="true">{gradeStyle.icon}</span>
                <span>{getGradeGoalText(summary)}</span>
              </span>
            </dd>
            <dd className={`text-xs font-medium ${goal.className}`}>
              {goal.label}
            </dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
