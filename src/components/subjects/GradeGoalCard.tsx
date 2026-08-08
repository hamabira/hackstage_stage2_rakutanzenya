import { Card } from "@/components/ui/Card";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";
import {
  GRADE_GOAL_CALCULATION_ERROR_MESSAGES,
  GRADE_GOAL_PRESENTATION,
} from "@/lib/calc/gradeGoalMessages";

interface GradeGoalCardProps {
  result: GradeGoalResult;
  targetScore: number | null;
}

/** 「あと何点必要か」を表示する。達成済み・達成不可能・計算不能を区別する。 */
export function GradeGoalCard({ result, targetScore }: GradeGoalCardProps) {
  const presentation = GRADE_GOAL_PRESENTATION[result.status];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">あと何点必要か</h2>
        <span className={`text-sm font-medium ${presentation.className}`}>
          {presentation.label}
        </span>
      </div>

      {result.status === "achieved" ? (
        <p className={`mt-2 text-3xl font-semibold ${presentation.className}`}>
          目標達成済み
        </p>
      ) : result.status === "unachievable" ? (
        <p className="mt-2 text-sm text-red-700">
          残りの評価項目で満点を取っても目標に届きません。目標点数を見直してください。
        </p>
      ) : result.requiredAverageOnRemaining === null ? (
        <p className="mt-2 text-sm text-gray-500">
          {result.calculationError === null
            ? "計算できませんでした。"
            : GRADE_GOAL_CALCULATION_ERROR_MESSAGES[result.calculationError]}
        </p>
      ) : (
        <>
          <p className={`mt-2 text-3xl font-semibold ${presentation.className}`}>
            平均 {result.requiredAverageOnRemaining} 点
          </p>
          <p className="mt-1 text-sm text-gray-600">
            未記録の評価項目で必要な100点換算の平均点です。
          </p>
        </>
      )}

      <dl className="mt-4 flex flex-col gap-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <dt>目標点数</dt>
          <dd>{targetScore === null ? "未設定" : `${targetScore} 点`}</dd>
        </div>
      </dl>
    </Card>
  );
}
