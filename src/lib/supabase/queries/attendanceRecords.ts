import { createClient } from "@/lib/supabase/server";

export interface AttendanceSummary {
  subjectId: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
}

/**
 * 複数科目の出席集計を一括取得する。
 * present / late を出席扱い、absent を欠席扱いとして集計する。
 */
export async function getAttendanceSummariesBySubjectIds(
  subjectIds: string[],
): Promise<Record<string, AttendanceSummary>> {
  if (subjectIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_records")
    .select("subject_id, status")
    .in("subject_id", subjectIds);

  if (error) {
    throw new Error("Failed to fetch attendance records", { cause: error });
  }

  const summaries: Record<string, AttendanceSummary> = {};

  for (const row of data ?? []) {
    const sid = row.subject_id;
    if (!summaries[sid]) {
      summaries[sid] = {
        subjectId: sid,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
      };
    }
    const s = summaries[sid];
    if (row.status === "present") s.presentCount++;
    else if (row.status === "late") s.lateCount++;
    else if (row.status === "absent") s.absentCount++;
    else if (row.status === "excused") s.excusedCount++;
  }

  return summaries;
}
