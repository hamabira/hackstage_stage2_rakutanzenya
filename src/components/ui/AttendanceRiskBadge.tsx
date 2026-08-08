import { ATTENDANCE_RISK_PRESENTATION } from "@/lib/calc/attendanceMessages";
import type { AttendanceRiskLevel } from "@/lib/calc/attendance";

const RISK_CLASS_NAMES: Record<AttendanceRiskLevel, string> = {
  on_track: "bg-[#e8f5ec] text-[#2f7d4e]",
  caution: "bg-[#fff3d6] text-[#b86f00]",
  danger: "bg-[#fce9e6] text-[#c44a42]",
  exceeded: "bg-[#f8dcd8] text-[#a9342d]",
  unavailable: "bg-[#eff0ec] text-[#697067]",
};

/** 出席危険度を色だけに依存せずラベル付きで表示する。 */
export function AttendanceRiskBadge({ riskLevel }: { riskLevel: AttendanceRiskLevel }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${RISK_CLASS_NAMES[riskLevel]}`}
    >
      {ATTENDANCE_RISK_PRESENTATION[riskLevel].label}
    </span>
  );
}
