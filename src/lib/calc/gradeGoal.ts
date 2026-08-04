export interface GradeGoalInput {
  gradeItems: Array<{
    weight: number;
    maxScore: number | null;
    currentScore: number | null; // 未実施ならnull
  }>;
  targetScore: number; // 0-100換算などの目標
}

export interface GradeGoalResult {
  requiredAverageOnRemaining: number | null;
  isAchievable: boolean;
}

// TODO: 実装は後続issueで行う(目標逆算計算ロジック実装issue)
export function calcRequiredScore(input: GradeGoalInput): GradeGoalResult {
  throw new Error("not implemented");
}
