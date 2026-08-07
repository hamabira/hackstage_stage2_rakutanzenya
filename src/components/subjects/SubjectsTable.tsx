import Link from "next/link";
import type { Subject, GradeItem } from "@/lib/types/domain";
import type { AttendanceCalcResult } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";
import { DeleteSubjectButton } from "@/components/subjects/DeleteSubjectButton";

interface SubjectsTableProps {
  subjects: Subject[];
  gradeItemsMap: Record<string, GradeItem[]>;
  attendanceResults: Record<string, AttendanceCalcResult | null>;
  gradeResults: Record<string, GradeGoalResult | null>;
}

export function SubjectsTable({
  subjects,
  gradeItemsMap,
  attendanceResults,
  gradeResults,
}: SubjectsTableProps) {
  if (subjects.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        登録済みの科目はまだありません。
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-6 py-4">科目名</th>
            <th className="px-6 py-4">目標</th>
            <th className="px-6 py-4">出席要件（あと何回）</th>
            <th className="px-6 py-4">成績要件（残り必要平均）</th>
            <th className="px-6 py-4">評価項目（概要）</th>
            <th className="px-6 py-4 text-center">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {subjects.map((subject) => {
            const att = attendanceResults[subject.id];
            const grd = gradeResults[subject.id];
            const items = gradeItemsMap[subject.id] ?? [];
            
            // 出席セルの表示
            let attDisplay = "影響なし";
            let attColor = "text-gray-400";
            if (att) {
              if (att.remainingAllowedAbsences != null) {
                if (att.remainingAllowedAbsences < 0) {
                  attDisplay = "超過";
                  attColor = "text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-md inline-flex items-center";
                } else {
                  attDisplay = `あと ${att.remainingAllowedAbsences} 回`;
                  if (att.isAtRisk) attColor = "text-red-700 font-semibold bg-red-50 px-2.5 py-1 rounded-md inline-flex items-center";
                  else attColor = "text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-md inline-flex items-center";
                }
              } else {
                attDisplay = "条件なし";
              }
            }

            // 成績セルの表示
            let grdDisplay = "未設定";
            let grdColor = "text-gray-400";
            if (grd) {
              if (grd.isAchievable) {
                if (grd.requiredAverageOnRemaining != null) {
                  grdDisplay = `平均 ${grd.requiredAverageOnRemaining}%`;
                  grdColor = "text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-md inline-flex items-center";
                } else {
                  grdDisplay = "達成済み 🎉";
                  grdColor = "text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-md inline-flex items-center";
                }
              } else {
                grdDisplay = "達成困難";
                grdColor = "text-orange-700 font-bold bg-orange-50 px-2.5 py-1 rounded-md inline-flex items-center";
              }
            }

            return (
              <tr key={subject.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <Link href={`/subjects/${subject.id}`} className="hover:text-indigo-600 transition-colors">
                    {subject.name}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  {subject.targetGradeLabel ? (
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {subject.targetGradeLabel}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={attColor}>{attDisplay}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={grdColor}>{grdDisplay}</span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {items.length > 0 
                    ? items.map(i => `${i.name}(${i.weight}%)`).join(", ") 
                    : "なし"}
                </td>
                <td className="px-6 py-4 text-center">
                  <DeleteSubjectButton subjectId={subject.id} subjectName={subject.name} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
