import { Card } from "@/components/ui/Card";
import { AttendanceRiskBadge } from "@/components/ui/AttendanceRiskBadge";
import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import {
  ATTENDANCE_CALCULATION_ERROR_MESSAGES,
  ATTENDANCE_RISK_PRESENTATION,
} from "@/lib/calc/attendanceMessages";
import type { AttendanceSummary } from "@/lib/attendance/attendanceSummary";

interface AttendanceSummaryCardProps {
  result: AttendanceCalcResult;
  summary: AttendanceSummary;
  totalClassCount: number | null;
}

/** 「あと何回休めるか」を表示する。計算不能な場合は理由を示す。 */
export function AttendanceSummaryCard({
  result,
  summary,
  totalClassCount,
}: AttendanceSummaryCardProps) {
  const risk = ATTENDANCE_RISK_PRESENTATION[result.riskLevel];
  const isUrgent = ["caution", "danger", "exceeded"].includes(result.riskLevel);

  return (
    <Card className={isUrgent ? "border-[#f3d6a0] bg-[#fff8ea]" : ""}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#5e655b]">あと何回休める？</h2>
        <AttendanceRiskBadge riskLevel={result.riskLevel} />
      </div>

      {result.remainingAllowedAbsences === null ? (
        <p className="mt-5 text-sm text-[#697067]">
          {result.calculationError === null
            ? "計算できませんでした。"
            : ATTENDANCE_CALCULATION_ERROR_MESSAGES[result.calculationError]}
        </p>
      ) : (
        <p className={`font-display mt-6 text-4xl font-bold ${risk.className}`}>
          {result.remainingAllowedAbsences < 0
            ? `${Math.abs(result.remainingAllowedAbsences)}回 超過`
            : `あと ${result.remainingAllowedAbsences} 回`}
        </p>
      )}

      <dl className="mt-8 flex flex-col gap-2 text-sm text-[#697067]">
        <div className="flex justify-between">
          <dt>現在の出席率</dt>
          <dd>
            {result.currentAttendanceRate === null
              ? "記録なし"
              : `${result.currentAttendanceRate}%`}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>出席 / 欠席</dt>
          <dd>
            {summary.attendedCount} / {summary.absentCount} 回
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>記録済み / 総授業回数</dt>
          <dd>
            {summary.recordedCount} / {totalClassCount ?? "未設定"} 回
          </dd>
        </div>
        {summary.statusCounts.excused === 0 ? null : (
          <div className="flex justify-between">
            <dt>公欠(出席率の計算から除外)</dt>
            <dd>{summary.statusCounts.excused} 回</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
