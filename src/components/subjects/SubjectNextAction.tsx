import Link from "next/link";
import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";

interface SubjectNextActionProps {
  attendance: AttendanceCalcResult;
  gradeGoal: GradeGoalResult;
  subjectId: string;
}

/** 科目の計算状態から、利用者が次に行う1つの操作を選んで提示する。 */
export function SubjectNextAction({
  attendance,
  gradeGoal,
  subjectId,
}: SubjectNextActionProps) {
  const remaining = attendance.remainingAllowedAbsences;

  const action =
    remaining !== null && remaining <= 1
      ? {
          description: "直近の授業の出席状況を記録する",
          href: `/subjects/${subjectId}/attendance`,
          label: "出席を記録",
        }
      : gradeGoal.status === "unachievable"
        ? {
            description: "目標点数または評価方法を見直す",
            href: `/subjects/${subjectId}/edit`,
            label: "設定を見直す",
          }
        : gradeGoal.requiredAverageOnRemaining !== null
          ? {
              description: "未記録のテスト・課題の点数を追加する",
              href: `/subjects/${subjectId}/tests`,
              label: "点数を記録",
            }
          : {
              description: "計算に必要な科目設定を確認する",
              href: `/subjects/${subjectId}/edit`,
              label: "設定を確認",
            };

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-[#edf7e9] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold text-[#337a24]">次にすること</p>
        <h2 className="font-display mt-1 text-lg font-bold">{action.description}</h2>
      </div>
      <Link
        className="w-fit shrink-0 rounded-full bg-[#72d350] px-5 py-2.5 text-sm font-bold text-[#20231f] hover:bg-[#64c544]"
        href={action.href}
      >
        {action.label} →
      </Link>
    </section>
  );
}
