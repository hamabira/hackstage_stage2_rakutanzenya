import Link from "next/link";
import type { Subject, GradeItem } from "@/lib/types/domain";
import type { AttendanceCalcResult, AttendanceRiskLevel } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";
import { DeleteSubjectButton } from "@/components/subjects/DeleteSubjectButton";

interface SubjectsTableProps {
  subjects: Subject[];
  gradeItemsMap: Record<string, GradeItem[]>;
  attendanceResults: Record<string, AttendanceCalcResult | null>;
  gradeResults: Record<string, GradeGoalResult | null>;
  /** "dashboard" | "subjects" — 見出しを出し分けるために使用 */
  context?: "dashboard" | "subjects";
}

// ─────────────────────────────────────────
// 空状態
// ─────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-8 py-12 text-center">
      <p className="text-base font-medium text-gray-700">
        まだ科目が登録されていません
      </p>
      <p className="mt-1 text-sm text-gray-500">
        科目を追加すると、出席状況や成績の目標達成状況をここで確認できます。
      </p>
      <Link
        href="/subjects/new"
        className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        最初の科目を追加する
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────
// 出席セル
// ─────────────────────────────────────────

function AttendanceCell({ result }: { result: AttendanceCalcResult | null }) {
  if (!result) {
    return <span className="text-gray-300 text-xs">影響なし</span>;
  }

  if (result.remainingAllowedAbsences === null) {
    return <span className="text-gray-400 text-xs">条件なし</span>;
  }

  const remaining = result.remainingAllowedAbsences;
  const riskLevel = result.riskLevel as AttendanceRiskLevel;

  const style: Record<AttendanceRiskLevel, string> = {
    on_track: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    caution: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    exceeded: "bg-red-100 text-red-800 border border-red-300 font-bold",
    unavailable: "text-gray-400",
  };

  const label =
    riskLevel === "exceeded"
      ? "超過"
      : `あと ${remaining} 回`;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${style[riskLevel] ?? ""}`}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────
// 成績セル
// ─────────────────────────────────────────

function GradeCell({ result }: { result: GradeGoalResult | null }) {
  if (!result) {
    return <span className="text-gray-300 text-xs">未設定</span>;
  }

  if (result.requiredAverageOnRemaining === 0) {
    return (
      <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        達成済み 🎉
      </span>
    );
  }

  if (!result.isAchievable) {
    return (
      <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
        達成困難
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      平均 {result.requiredAverageOnRemaining}%
    </span>
  );
}

// ─────────────────────────────────────────
// 行の「注意」判定
// ─────────────────────────────────────────

function isAlertRow(
  att: AttendanceCalcResult | null,
  grd: GradeGoalResult | null,
): boolean {
  if (att?.isAtRisk) return true;
  if (grd && !grd.isAchievable) return true;
  return false;
}

// ─────────────────────────────────────────
// テーブル本体
// ─────────────────────────────────────────

export function SubjectsTable({
  subjects,
  gradeItemsMap,
  attendanceResults,
  gradeResults,
}: SubjectsTableProps) {
  if (subjects.length === 0) {
    return <EmptyState />;
  }

  // 注意が必要な科目数を算出（ページ上部バナーに使用）
  const alertCount = subjects.filter((s) =>
    isAlertRow(attendanceResults[s.id] ?? null, gradeResults[s.id] ?? null),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* 注意科目バナー */}
      {alertCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span className="font-semibold">⚠ 注意が必要な科目が {alertCount} 件あります</span>
          <span className="text-yellow-600">— 行が強調表示されています</span>
        </div>
      )}

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-4 w-4" aria-hidden="true" />
              <th className="px-5 py-4">科目名</th>
              <th className="px-5 py-4">目標</th>
              <th className="px-5 py-4">出席（あと何回）</th>
              <th className="px-5 py-4">成績（残り必要平均）</th>
              <th className="px-5 py-4">評価項目</th>
              <th className="px-5 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subjects.map((subject) => {
              const att = attendanceResults[subject.id] ?? null;
              const grd = gradeResults[subject.id] ?? null;
              const items = gradeItemsMap[subject.id] ?? [];
              const alert = isAlertRow(att, grd);

              return (
                <tr
                  key={subject.id}
                  className={`transition-colors ${
                    alert
                      ? "bg-yellow-50/40 hover:bg-yellow-50/70"
                      : "hover:bg-gray-50/50"
                  }`}
                >
                  {/* 注意インジケーター（左端の細い帯） */}
                  <td className="pl-4 pr-0 py-4 w-4">
                    {alert && (
                      <span
                        className="block w-1 h-6 rounded-full bg-yellow-400"
                        aria-label="注意が必要"
                      />
                    )}
                  </td>

                  <td className="px-5 py-4 font-medium text-gray-900">
                    <Link
                      href={`/subjects/${subject.id}`}
                      className="hover:text-indigo-600 transition-colors"
                    >
                      {subject.name}
                    </Link>
                  </td>

                  <td className="px-5 py-4">
                    {subject.targetGradeLabel ? (
                      <span className="inline-block bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {subject.targetGradeLabel}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <AttendanceCell result={att} />
                  </td>

                  <td className="px-5 py-4">
                    <GradeCell result={grd} />
                  </td>

                  <td className="px-5 py-4 text-xs text-gray-500 max-w-[200px]">
                    {items.length > 0 ? (
                      <span className="line-clamp-2">
                        {items.map((i) => `${i.name}(${i.weight}%)`).join(", ")}
                      </span>
                    ) : (
                      <Link
                        href={`/subjects/${subject.id}/edit`}
                        className="text-gray-400 underline hover:text-gray-600"
                      >
                        評価項目を追加
                      </Link>
                    )}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <DeleteSubjectButton
                      subjectId={subject.id}
                      subjectName={subject.name}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
