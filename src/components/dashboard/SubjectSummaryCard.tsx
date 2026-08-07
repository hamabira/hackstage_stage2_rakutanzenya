import Link from "next/link";
import type { GradeItem, Subject } from "@/lib/types/domain";
import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";
import { Card } from "@/components/ui/Card";
import { GradeItemsTable } from "@/components/dashboard/GradeItemsTable";

interface SubjectSummaryCardProps {
  subject: Subject;
  gradeItems: GradeItem[];
  attendanceResult: AttendanceCalcResult | null;
  gradeResult: GradeGoalResult | null;
}

export function SubjectSummaryCard({
  subject,
  gradeItems,
  attendanceResult,
  gradeResult,
}: SubjectSummaryCardProps) {
  return (
    <Link
      href={`/subjects/${subject.id}`}
      className="block transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
    >
      <Card className="h-full">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-tight">
            {subject.name}
          </h3>
          {subject.targetGradeLabel && (
            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
              目標: {subject.targetGradeLabel}
            </span>
          )}
        </div>

        {/* 計算結果サマリ */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <AttendanceSummaryCell result={attendanceResult} />
          <GradeSummaryCell result={gradeResult} />
        </div>

        {/* 評価基準テーブル */}
        <h4 className="mt-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
          評価基準
        </h4>
        <GradeItemsTable items={gradeItems} />
      </Card>
    </Link>
  );
}

// ---- 出席サマリセル ----

function AttendanceSummaryCell({
  result,
}: {
  result: AttendanceCalcResult | null;
}) {
  if (result === null) {
    return (
      <div className="rounded-md bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-400">出席影響なし</p>
      </div>
    );
  }

  const { remainingAllowedAbsences, currentAttendanceRate, isAtRisk } = result;

  return (
    <div
      className={`rounded-md px-3 py-2 ${
        isAtRisk ? "bg-red-50" : "bg-emerald-50"
      }`}
    >
      <p className="text-xs font-medium text-gray-500">あと何回休める？</p>
      {remainingAllowedAbsences != null ? (
        <p
          className={`mt-0.5 text-lg font-bold ${
            isAtRisk ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {remainingAllowedAbsences < 0 ? "超過" : `${remainingAllowedAbsences}回`}
        </p>
      ) : (
        <p className="mt-0.5 text-sm text-gray-400">条件なし</p>
      )}
      <p className="text-xs text-gray-400">
        出席率 {Math.round(currentAttendanceRate * 100)}%
      </p>
    </div>
  );
}

// ---- 成績サマリセル ----

function GradeSummaryCell({ result }: { result: GradeGoalResult | null }) {
  if (result === null) {
    return (
      <div className="rounded-md bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-400">目標未設定</p>
      </div>
    );
  }

  const { requiredAverageOnRemaining, isAchievable } = result;

  return (
    <div
      className={`rounded-md px-3 py-2 ${
        isAchievable ? "bg-blue-50" : "bg-orange-50"
      }`}
    >
      <p className="text-xs font-medium text-gray-500">あと何点必要？</p>
      {requiredAverageOnRemaining != null ? (
        <p
          className={`mt-0.5 text-lg font-bold ${
            isAchievable ? "text-blue-600" : "text-orange-600"
          }`}
        >
          {isAchievable
            ? `平均 ${requiredAverageOnRemaining}%`
            : "達成困難"}
        </p>
      ) : (
        <p
          className={`mt-0.5 text-sm font-semibold ${
            isAchievable ? "text-blue-600" : "text-orange-600"
          }`}
        >
          {isAchievable ? "達成済み 🎉" : "未達成"}
        </p>
      )}
      {!isAchievable && requiredAverageOnRemaining != null && (
        <p className="text-xs text-orange-400">
          残り項目で平均 {requiredAverageOnRemaining}% 必要
        </p>
      )}
    </div>
  );
}
