import { Card } from "@/components/ui/Card";
import type { CourseGoalResult } from "@/lib/calc/courseGoal";
import { COURSE_GOAL_UNACHIEVABLE_MESSAGES } from "@/lib/calc/courseGoalMessages";
import {
  GRADE_GOAL_CALCULATION_ERROR_MESSAGES,
  GRADE_GOAL_PRESENTATION,
} from "@/lib/calc/gradeGoalMessages";

interface GradeGoalCardProps {
  result: CourseGoalResult;
  targetScore: number | null;
}

/** 「あと何点必要か」を表示する。達成済み・達成不可能・計算不能を区別する。 */
export function GradeGoalCard({ result, targetScore }: GradeGoalCardProps) {
  const presentation = GRADE_GOAL_PRESENTATION[result.status];
  const badgeClassName =
    result.status === "unachievable"
      ? "bg-[#fce9e6] text-[#c44a42]"
      : result.status === "unavailable"
        ? "bg-[#eff0ec] text-[#697067]"
        : "bg-[#e8f5ec] text-[#2f7d4e]";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#5e655b]">目標まであと何点？</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClassName}`}>
          {presentation.label}
        </span>
      </div>

      {result.status === "achieved" ? (
        <p className={`font-display mt-6 text-4xl font-bold ${presentation.className}`}>
          目標達成済み
        </p>
      ) : result.status === "unachievable" ? (
        <p className="mt-6 text-sm text-red-700">
          {COURSE_GOAL_UNACHIEVABLE_MESSAGES[
            result.unachievableReason ?? "score_insufficient"
          ]}
        </p>
      ) : result.requiredAverageOnRemaining === null ? (
        <p className="mt-6 text-sm text-[#697067]">
          {result.calculationError === null
            ? "計算できませんでした。"
            : GRADE_GOAL_CALCULATION_ERROR_MESSAGES[result.calculationError]}
        </p>
      ) : (
        <>
          <p className={`font-display mt-6 text-4xl font-bold text-[#20231f]`}>
            平均 {result.requiredAverageOnRemaining} 点
          </p>
          <p className="mt-2 text-sm text-[#697067]">
            未記録の評価項目で必要な100点換算の平均点です。
          </p>
        </>
      )}

      <dl className="mt-8 flex flex-col gap-1 text-sm text-[#697067]">
        <div className="flex justify-between">
          <dt>目標点数</dt>
          <dd>{targetScore === null ? "未設定" : `${targetScore} 点`}</dd>
        </div>
      </dl>
    </Card>
  );
}
