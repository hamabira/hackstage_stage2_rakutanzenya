import type { CourseGoalUnachievableReason } from "@/lib/calc/courseGoal";

export const COURSE_GOAL_UNACHIEVABLE_MESSAGES: Record<
  CourseGoalUnachievableReason,
  string
> = {
  attendance_exceeded: "欠席可能数を超過しているため、目標達成は不可能です。出席記録と履修条件を確認してください。",
  score_insufficient: "残りの評価項目で満点を取っても目標に届きません。目標点数を見直してください。",
};
