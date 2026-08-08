import type { GradeGoalCalculationError, GradeGoalStatus } from "@/lib/calc/gradeGoal";

/** 達成状況ごとの表示ラベルと配色。 */
export const GRADE_GOAL_PRESENTATION: Record<
  GradeGoalStatus,
  { label: string; className: string }
> = {
  achieved: { label: "目標達成済み", className: "text-green-700" },
  achievable: { label: "達成可能", className: "text-green-700" },
  unachievable: { label: "達成不可能", className: "text-red-700" },
  unavailable: { label: "計算不可", className: "text-gray-500" },
};

/**
 * 計算できなかった理由を利用者向けの説明に変換する。
 * 「登録が足りない」のか「登録内容が不正」なのかを区別できる文言にする。
 */
export const GRADE_GOAL_CALCULATION_ERROR_MESSAGES: Record<
  GradeGoalCalculationError,
  string
> = {
  missing_target_score: "目標点数を登録すると、あと何点必要かを計算できます。",
  invalid_target_score: "目標点数が0〜100の範囲外です。科目設定を確認してください。",
  missing_grade_items: "評価項目を登録すると、あと何点必要かを計算できます。",
  invalid_grade_item_weight: "評価割合が0〜100の範囲外の評価項目があります。",
  invalid_weight_total: "評価割合の合計が100%になっていません。科目設定を確認してください。",
  missing_max_score: "満点が未設定の評価項目があります。科目設定を確認してください。",
  invalid_max_score: "満点が正しく登録されていない評価項目があります。",
  invalid_current_score: "満点を超える得点記録があります。記録を確認してください。",
};
