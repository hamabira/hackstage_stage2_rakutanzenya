import type { GradeGoalInput } from "@/lib/calc/gradeGoal";
import type { GradeItem, TestRecord } from "@/lib/types/domain";

export interface GradeItemScore {
  gradeItem: GradeItem;
  /** 記録の平均点。記録が1件もない場合はnull。 */
  currentScore: number | null;
  recordCount: number;
}

/**
 * 評価項目ごとに得点記録を平均する。
 *
 * 要件SCORE-09では「各回を100点換算したうえで単純平均する」と定めているが、
 * 同じ評価項目の記録は満点が共通なので、素点の単純平均を取ってから
 * 100点換算しても結果は一致する。計算誤差を減らすため素点のまま平均する。
 */
export function summarizeGradeItemScores(
  gradeItems: GradeItem[],
  testRecords: TestRecord[],
): GradeItemScore[] {
  const scoresByGradeItemId = new Map<string, number[]>();

  for (const record of testRecords) {
    const scores = scoresByGradeItemId.get(record.gradeItemId) ?? [];
    scores.push(record.score);
    scoresByGradeItemId.set(record.gradeItemId, scores);
  }

  return gradeItems.map((gradeItem) => {
    const scores = scoresByGradeItemId.get(gradeItem.id) ?? [];

    if (scores.length === 0) {
      return { gradeItem, currentScore: null, recordCount: 0 };
    }

    const total = scores.reduce((sum, score) => sum + score, 0);

    return {
      gradeItem,
      currentScore: total / scores.length,
      recordCount: scores.length,
    };
  });
}

/** 集計結果を目標点数逆算の入力へ変換する。 */
export function toGradeGoalItems(
  gradeItemScores: GradeItemScore[],
): GradeGoalInput["gradeItems"] {
  return gradeItemScores.map(({ gradeItem, currentScore }) => ({
    weight: gradeItem.weight,
    maxScore: gradeItem.maxScore,
    currentScore,
  }));
}
