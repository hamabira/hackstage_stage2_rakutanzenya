import { describe, expect, it } from "vitest";
import { calcCourseGoal } from "./courseGoal";

const onTrackAttendance = {
  remainingAllowedAbsences: 2,
  currentAttendanceRate: 90,
  riskLevel: "on_track" as const,
  calculationError: null,
  isAtRisk: false,
};

const exceededAttendance = {
  ...onTrackAttendance,
  remainingAllowedAbsences: -1,
  riskLevel: "exceeded" as const,
  isAtRisk: true,
};

const achievedGradeGoal = {
  status: "achieved" as const,
  requiredAverageOnRemaining: null,
  isAchievable: true,
  calculationError: null,
};

describe("calcCourseGoal", () => {
  it("欠席上限を超過した場合は、点数目標が達成済みでも達成不可能にする", () => {
    expect(
      calcCourseGoal({ attendance: exceededAttendance, gradeGoal: achievedGradeGoal }),
    ).toMatchObject({
      status: "unachievable",
      isAchievable: false,
      unachievableReason: "attendance_exceeded",
    });
  });

  it("欠席上限を超過していない場合は、点数計算の結果を維持する", () => {
    expect(
      calcCourseGoal({ attendance: onTrackAttendance, gradeGoal: achievedGradeGoal }),
    ).toMatchObject({
      status: "achieved",
      isAchievable: true,
      unachievableReason: null,
    });
  });

  it("点数不足の達成不可能には点数不足の理由を付与する", () => {
    expect(
      calcCourseGoal({
        attendance: onTrackAttendance,
        gradeGoal: {
          ...achievedGradeGoal,
          status: "unachievable",
          isAchievable: false,
        },
      }),
    ).toMatchObject({ unachievableReason: "score_insufficient" });
  });
});
