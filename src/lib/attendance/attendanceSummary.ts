import type { AttendanceRecord, AttendanceStatus } from "@/lib/types/domain";

export interface AttendanceSummary {
  /** 出席として数える回数(出席・遅刻)。 */
  attendedCount: number;
  /** 欠席として数える回数。 */
  absentCount: number;
  /** ステータスごとの記録件数。 */
  statusCounts: Record<AttendanceStatus, number>;
  /** 記録済みの授業回数(公欠を除く)。 */
  recordedCount: number;
}

/**
 * 出席記録をステータスごとに数え、出席計算の入力へ変換する。
 *
 * 要件ATT-03によりMVPで扱うのは出席・欠席の2種類だが、DBは4状態を保持できる。
 * 残りの2状態は次のように扱う。
 * - 遅刻: 授業には参加しているため出席として数える
 * - 公欠: 出席でも欠席でもないため、出席率の分母から除外する
 */
export function summarizeAttendanceRecords(
  records: AttendanceRecord[],
): AttendanceSummary {
  const statusCounts: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  for (const record of records) {
    statusCounts[record.status] += 1;
  }

  const attendedCount = statusCounts.present + statusCounts.late;
  const absentCount = statusCounts.absent;

  return {
    attendedCount,
    absentCount,
    statusCounts,
    recordedCount: attendedCount + absentCount,
  };
}
