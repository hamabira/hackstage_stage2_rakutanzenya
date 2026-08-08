import { describe, expect, it } from "vitest";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types/domain";
import { summarizeAttendanceRecords } from "./attendanceSummary";

function buildRecords(statuses: AttendanceStatus[]): AttendanceRecord[] {
  return statuses.map((status, index) => ({
    id: `record-${index}`,
    subjectId: "subject-1",
    classDate: `2026-04-${String(index + 1).padStart(2, "0")}`,
    status,
    memo: null,
  }));
}

describe("summarizeAttendanceRecords", () => {
  it("出席と欠席を数える", () => {
    const summary = summarizeAttendanceRecords(
      buildRecords(["present", "present", "absent"]),
    );

    expect(summary).toMatchObject({
      attendedCount: 2,
      absentCount: 1,
      recordedCount: 3,
    });
  });

  it("遅刻を出席として数える", () => {
    const summary = summarizeAttendanceRecords(buildRecords(["present", "late"]));

    expect(summary.attendedCount).toBe(2);
    expect(summary.absentCount).toBe(0);
  });

  it("公欠を出席にも欠席にも数えない", () => {
    const summary = summarizeAttendanceRecords(
      buildRecords(["present", "excused", "excused"]),
    );

    expect(summary).toMatchObject({
      attendedCount: 1,
      absentCount: 0,
      recordedCount: 1,
    });
    expect(summary.statusCounts.excused).toBe(2);
  });

  it("ステータスごとの件数を保持する", () => {
    const summary = summarizeAttendanceRecords(
      buildRecords(["present", "absent", "late", "excused", "absent"]),
    );

    expect(summary.statusCounts).toEqual({
      present: 1,
      absent: 2,
      late: 1,
      excused: 1,
    });
  });

  it("記録が無い場合はすべて0になる", () => {
    const summary = summarizeAttendanceRecords([]);

    expect(summary).toMatchObject({
      attendedCount: 0,
      absentCount: 0,
      recordedCount: 0,
    });
  });
});
