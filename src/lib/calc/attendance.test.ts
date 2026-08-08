import { describe, expect, it } from "vitest";
import { calcRemainingAbsences } from "./attendance";

describe("calcRemainingAbsences", () => {
  it("必要出席率から残り許容欠席数を計算する", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 15,
        attendedCount: 8,
        absentCount: 2,
        requiredRate: 80,
        maxAbsences: null,
      }),
    ).toMatchObject({
      currentAttendanceRate: 80,
      remainingAllowedAbsences: 1,
      riskLevel: "caution",
      calculationError: null,
      isAtRisk: true,
    });
  });

  it("最大欠席数だけでも計算する", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 15,
        attendedCount: 8,
        absentCount: 2,
        requiredRate: null,
        maxAbsences: 4,
      }),
    ).toMatchObject({
      remainingAllowedAbsences: 2,
      riskLevel: "on_track",
    });
  });

  it("出席率と最大欠席数が両方ある場合は厳しい方を採用する", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 15,
        attendedCount: 8,
        absentCount: 2,
        requiredRate: 80,
        maxAbsences: 2,
      }),
    ).toMatchObject({
      remainingAllowedAbsences: 0,
      riskLevel: "danger",
    });
  });

  it.each([
    [2, "on_track", false],
    [1, "caution", true],
    [0, "danger", true],
    [-1, "exceeded", true],
  ] as const)("残り%d回を%sとして判定する", (remaining, riskLevel, isAtRisk) => {
    const absentCount = 3 - remaining;
    expect(
      calcRemainingAbsences({
        totalClassCount: 10,
        attendedCount: 5,
        absentCount,
        requiredRate: null,
        maxAbsences: 3,
      }),
    ).toMatchObject({ remainingAllowedAbsences: remaining, riskLevel, isAtRisk });
  });

  it("出席条件がない場合は計算不能を返す", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 15,
        attendedCount: 8,
        absentCount: 2,
        requiredRate: null,
        maxAbsences: null,
      }),
    ).toMatchObject({
      remainingAllowedAbsences: null,
      riskLevel: "unavailable",
      calculationError: "missing_attendance_condition",
    });
  });

  it("記録がない場合は現在出席率を返さない", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 15,
        attendedCount: 0,
        absentCount: 0,
        requiredRate: 80,
        maxAbsences: null,
      }),
    ).toMatchObject({
      currentAttendanceRate: null,
      remainingAllowedAbsences: 3,
      riskLevel: "on_track",
    });
  });

  it("必要出席率の1を1%として扱う", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 10,
        attendedCount: 0,
        absentCount: 0,
        requiredRate: 1,
        maxAbsences: null,
      }),
    ).toMatchObject({ remainingAllowedAbsences: 9 });
  });

  it("現在出席率を小数第1位まで丸める", () => {
    expect(
      calcRemainingAbsences({
        totalClassCount: 15,
        attendedCount: 2,
        absentCount: 1,
        requiredRate: 80,
        maxAbsences: null,
      }),
    ).toMatchObject({ currentAttendanceRate: 66.7 });
  });

  it.each([
    [
      { totalClassCount: 0, attendedCount: 0, absentCount: 0, requiredRate: 80, maxAbsences: null },
      "invalid_total_class_count",
    ],
    [
      { totalClassCount: 10, attendedCount: -1, absentCount: 0, requiredRate: 80, maxAbsences: null },
      "invalid_attended_count",
    ],
    [
      { totalClassCount: 10, attendedCount: 5, absentCount: -1, requiredRate: 80, maxAbsences: null },
      "invalid_absent_count",
    ],
    [
      { totalClassCount: 10, attendedCount: 5, absentCount: 6, requiredRate: 80, maxAbsences: null },
      "recorded_count_exceeds_total",
    ],
    [
      { totalClassCount: 10, attendedCount: 5, absentCount: 0, requiredRate: 101, maxAbsences: null },
      "invalid_required_rate",
    ],
    [
      { totalClassCount: 10, attendedCount: 5, absentCount: 0, requiredRate: null, maxAbsences: -1 },
      "invalid_max_absences",
    ],
  ] as const)("不正入力を計算不能として扱う", (input, calculationError) => {
    expect(calcRemainingAbsences(input)).toMatchObject({
      remainingAllowedAbsences: null,
      currentAttendanceRate: null,
      riskLevel: "unavailable",
      calculationError,
      isAtRisk: false,
    });
  });
});
