import type { GradeItem, GradeItemCategory } from "@/lib/types/domain";

const CATEGORY_LABELS: Record<GradeItemCategory, string> = {
  attendance: "出席",
  assignment: "課題",
  test: "テスト",
  other: "その他",
};

const CATEGORY_BADGE_CLASS: Record<GradeItemCategory, string> = {
  attendance: "bg-blue-100 text-blue-700",
  assignment: "bg-green-100 text-green-700",
  test: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

interface GradeItemsTableProps {
  items: GradeItem[];
}

export function GradeItemsTable({ items }: GradeItemsTableProps) {
  if (items.length === 0) {
    return (
      <p className="mt-2 text-xs text-gray-400">評価項目がまだ登録されていません</p>
    );
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">評価項目</th>
            <th className="px-3 py-2 font-medium">種別</th>
            <th className="px-3 py-2 text-right font-medium">配点</th>
            <th className="px-3 py-2 text-right font-medium">比重</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => (
            <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
                >
                  {CATEGORY_LABELS[item.category]}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-gray-600">
                {item.maxScore != null ? `${item.maxScore}点` : "—"}
              </td>
              <td className="px-3 py-2 text-right text-gray-600">
                {item.weight}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <td colSpan={3} className="px-3 py-1.5 text-right font-medium">
              合計比重
            </td>
            <td
              className={`px-3 py-1.5 text-right font-semibold ${
                totalWeight === 100 ? "text-green-600" : "text-orange-500"
              }`}
            >
              {totalWeight}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
