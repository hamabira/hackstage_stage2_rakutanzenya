import { describe, expect, it } from "vitest";
import { calcRequiredScore } from "@/lib/calc/gradeGoal";
import type { GradeItem, TestRecord } from "@/lib/types/domain";
import { summarizeGradeItemScores, toGradeGoalItems } from "./gradeItemScores";

function buildGradeItem(overrides: Partial<GradeItem> = {}): GradeItem {
  return {
    id: "item-1",
    subjectId: "subject-1",
    name: "中間テスト",
    category: "test",
    weight: 50,
    maxScore: 100,
    sortOrder: 0,
    ...overrides,
  };
}

function buildTestRecord(gradeItemId: string, score: number, id = "record"): TestRecord {
  return {
    id: `${id}-${score}`,
    gradeItemId,
    score,
    recordedAt: "2026-04-10",
    memo: null,
  };
}

describe("summarizeGradeItemScores", () => {
  it("記録がない評価項目のcurrentScoreはnullになる", () => {
    const result = summarizeGradeItemScores([buildGradeItem()], []);

    expect(result[0]).toMatchObject({ currentScore: null, recordCount: 0 });
  });

  it("記録が1件ならその点数を使う", () => {
    const result = summarizeGradeItemScores(
      [buildGradeItem()],
      [buildTestRecord("item-1", 80)],
    );

    expect(result[0]).toMatchObject({ currentScore: 80, recordCount: 1 });
  });

  it("反復型の複数実績を単純平均する(SCORE-09)", () => {
    const result = summarizeGradeItemScores(
      [buildGradeItem()],
      [
        buildTestRecord("item-1", 60, "a"),
        buildTestRecord("item-1", 90, "b"),
        buildTestRecord("item-1", 75, "c"),
      ],
    );

    expect(result[0]).toMatchObject({ currentScore: 75, recordCount: 3 });
  });

  it("評価項目ごとに記録を振り分ける", () => {
    const result = summarizeGradeItemScores(
      [
        buildGradeItem({ id: "item-1" }),
        buildGradeItem({ id: "item-2", name: "期末テスト" }),
      ],
      [buildTestRecord("item-1", 80, "a"), buildTestRecord("item-2", 40, "b")],
    );

    expect(result.map((item) => item.currentScore)).toEqual([80, 40]);
  });

  it("どの評価項目にも属さない記録は無視する", () => {
    const result = summarizeGradeItemScores(
      [buildGradeItem({ id: "item-1" })],
      [buildTestRecord("item-999", 100)],
    );

    expect(result[0].currentScore).toBeNull();
  });
});

describe("toGradeGoalItems", () => {
  it("目標点数逆算の入力へ変換する", () => {
    const scores = summarizeGradeItemScores(
      [buildGradeItem()],
      [buildTestRecord("item-1", 80)],
    );

    expect(toGradeGoalItems(scores)).toEqual([
      { weight: 50, maxScore: 100, currentScore: 80 },
    ]);
  });

  it("満点が異なる評価項目でも100点換算で逆算できる", () => {
    // 中間(満点50,重み50%)で40点=80%を取得済み。目標70点なら
    // 残り50%の期末で必要なのは (70 - 40) / 50 * 100 = 60点。
    const scores = summarizeGradeItemScores(
      [
        buildGradeItem({ id: "item-1", weight: 50, maxScore: 50 }),
        buildGradeItem({ id: "item-2", weight: 50, maxScore: 100 }),
      ],
      [buildTestRecord("item-1", 40)],
    );

    const result = calcRequiredScore({
      gradeItems: toGradeGoalItems(scores),
      targetScore: 70,
    });

    expect(result).toMatchObject({
      status: "achievable",
      requiredAverageOnRemaining: 60,
    });
  });
});
