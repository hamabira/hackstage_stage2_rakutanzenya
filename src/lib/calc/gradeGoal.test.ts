import { describe, expect, it } from "vitest";
import { calcRequiredScore } from "./gradeGoal";

describe("calcRequiredScore", () => {
  it("取得済み点数と未実施項目から必要平均点を計算する", () => {
    expect(
      calcRequiredScore({
        targetScore: 80,
        gradeItems: [
          { weight: 40, maxScore: 50, currentScore: 35 },
          { weight: 60, maxScore: 100, currentScore: null },
        ],
      }),
    ).toEqual({
      status: "achievable",
      requiredAverageOnRemaining: 86.7,
      isAchievable: true,
      calculationError: null,
    });
  });

  it("すでに目標を達成している場合は必要平均点を返さない", () => {
    expect(
      calcRequiredScore({
        targetScore: 70,
        gradeItems: [
          { weight: 70, maxScore: 100, currentScore: 100 },
          { weight: 30, maxScore: 100, currentScore: null },
        ],
      }),
    ).toMatchObject({
      status: "achieved",
      requiredAverageOnRemaining: null,
      isAchievable: true,
    });
  });

  it("残り項目でちょうど100点必要な場合は達成可能とする", () => {
    expect(
      calcRequiredScore({
        targetScore: 80,
        gradeItems: [
          { weight: 20, maxScore: 100, currentScore: 0 },
          { weight: 80, maxScore: 100, currentScore: null },
        ],
      }),
    ).toMatchObject({
      status: "achievable",
      requiredAverageOnRemaining: 100,
      isAchievable: true,
    });
  });

  it("残り項目で100点を超える場合は達成不可能とする", () => {
    expect(
      calcRequiredScore({
        targetScore: 81,
        gradeItems: [
          { weight: 20, maxScore: 100, currentScore: 0 },
          { weight: 80, maxScore: 100, currentScore: null },
        ],
      }),
    ).toMatchObject({
      status: "unachievable",
      requiredAverageOnRemaining: null,
      isAchievable: false,
    });
  });

  it("未実施項目がなく目標未達なら達成不可能とする", () => {
    expect(
      calcRequiredScore({
        targetScore: 80,
        gradeItems: [{ weight: 100, maxScore: 100, currentScore: 70 }],
      }),
    ).toMatchObject({ status: "unachievable", isAchievable: false });
  });

  it.each([
    [null, "missing_target_score"],
    [-0.01, "invalid_target_score"],
    [100.001, "invalid_target_score"],
  ] as const)("目標点数 %s は計算不能とする", (targetScore, calculationError) => {
    expect(
      calcRequiredScore({
        targetScore,
        gradeItems: [{ weight: 100, maxScore: 100, currentScore: null }],
      }),
    ).toMatchObject({ status: "unavailable", calculationError, isAchievable: null });
  });

  it("評価項目がない場合は計算不能とする", () => {
    expect(calcRequiredScore({ targetScore: 80, gradeItems: [] })).toMatchObject({
      status: "unavailable",
      calculationError: "missing_grade_items",
    });
  });

  it.each([
    [{ weight: 99, maxScore: 100, currentScore: null }, "invalid_weight_total"],
    [{ weight: -1, maxScore: 100, currentScore: null }, "invalid_grade_item_weight"],
    [{ weight: 100, maxScore: null, currentScore: null }, "missing_max_score"],
    [{ weight: 100, maxScore: 0, currentScore: null }, "invalid_max_score"],
    [{ weight: 100, maxScore: 100, currentScore: -1 }, "invalid_current_score"],
    [{ weight: 100, maxScore: 100, currentScore: 100.01 }, "invalid_current_score"],
  ] as const)("不正な評価項目は計算不能とする", (gradeItem, calculationError) => {
    expect(calcRequiredScore({ targetScore: 80, gradeItems: [gradeItem] })).toMatchObject({
      status: "unavailable",
      calculationError,
    });
  });

  it("入力点数は小数第2位まで扱い、必要平均点は小数第1位へ丸める", () => {
    expect(
      calcRequiredScore({
        targetScore: 80.55,
        gradeItems: [
          { weight: 50, maxScore: 20, currentScore: 15.55 },
          { weight: 50, maxScore: 100, currentScore: null },
        ],
      }),
    ).toMatchObject({ status: "achievable", requiredAverageOnRemaining: 83.4 });
  });
});
