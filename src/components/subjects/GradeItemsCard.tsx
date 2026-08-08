import { Card } from "@/components/ui/Card";
import type { GradeItemScore } from "@/lib/grades/gradeItemScores";
import type { GradeItemCategory } from "@/lib/types/domain";

const CATEGORY_LABELS: Record<GradeItemCategory, string> = {
  attendance: "出席",
  assignment: "課題・レポート",
  test: "テスト",
  other: "その他",
};

interface GradeItemsCardProps {
  gradeItemScores: GradeItemScore[];
}

/** 評価項目ごとの評価割合と現在の得点を一覧で表示する。 */
export function GradeItemsCard({ gradeItemScores }: GradeItemsCardProps) {
  const weightTotal = gradeItemScores.reduce(
    (total, { gradeItem }) => total + gradeItem.weight,
    0,
  );

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">評価項目</h2>

      {gradeItemScores.length === 0 ? (
        <p className="mt-3 text-sm text-[#697067]">評価項目が登録されていません。</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#697067]">
                <tr>
                  <th className="py-1 pr-4 font-medium">項目</th>
                  <th className="py-1 pr-4 font-medium">種類</th>
                  <th className="py-1 pr-4 font-medium">割合</th>
                  <th className="py-1 font-medium">現在の得点</th>
                </tr>
              </thead>
              <tbody>
                {gradeItemScores.map(({ gradeItem, currentScore, recordCount }) => (
                  <tr key={gradeItem.id} className="border-t">
                    <td className="py-3 pr-4 font-semibold">{gradeItem.name}</td>
                    <td className="py-3 pr-4 text-[#697067]">
                      {CATEGORY_LABELS[gradeItem.category]}
                    </td>
                    <td className="py-2 pr-4">{gradeItem.weight}%</td>
                    <td className="py-2">
                      {currentScore === null ? (
                        <span className="font-semibold text-[#d98a16]">未記録</span>
                      ) : (
                        <>
                          {currentScore} / {gradeItem.maxScore ?? "満点未設定"}
                          {recordCount > 1 ? (
                            <span className="ml-1 text-[#697067]">
                              ({recordCount}件の平均)
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-[#697067]">
            評価割合の合計: {weightTotal}%
          </p>
        </>
      )}
    </Card>
  );
}
