import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ATTENDANCE_RISK_PRESENTATION } from "@/lib/calc/attendanceMessages";
import { GRADE_GOAL_PRESENTATION } from "@/lib/calc/gradeGoalMessages";
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
  const risk = ATTENDANCE_RISK_PRESENTATION[summary.attendance.riskLevel];
  const goal = GRADE_GOAL_PRESENTATION[summary.gradeGoal.status];

  return (
    <Link href={`/subjects/${summary.subject.id}`}>
      <Card className="h-full hover:border-gray-400">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{summary.subject.name}</h3>
          <span className={`shrink-0 text-sm font-medium ${risk.className}`}>
            {risk.label}
          </span>
        </div>

        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-gray-600">あと何回休めるか</dt>
            <dd className={`font-medium ${risk.className}`}>
              {getAttendanceText(summary)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-gray-600">あと何点必要か</dt>
            <dd className={`font-medium ${goal.className}`}>
              {getGradeGoalText(summary)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-gray-600">現在の出席率</dt>
            <dd>
              {summary.attendance.currentAttendanceRate === null
                ? "記録なし"
                : `${summary.attendance.currentAttendanceRate}%`}
            </dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
