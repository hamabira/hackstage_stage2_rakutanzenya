import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectById } from "@/lib/supabase/queries/subjects";
import { getAttendanceRecordsBySubjectId } from "@/lib/supabase/queries/attendanceRecords";
import { upsertAttendanceRecord } from "@/app/actions/attendance";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { DeleteAttendanceButton } from "@/components/attendance/DeleteAttendanceButton";

const STATUS_LABEL: Record<string, string> = {
  present: "出席",
  absent: "欠席",
  late: "遅刻",
  excused: "公欠",
};

const STATUS_STYLE: Record<string, string> = {
  present:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  absent: "bg-red-50 text-red-700 border border-red-200",
  late: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  excused: "bg-blue-50 text-blue-700 border border-blue-200",
};

export default async function SubjectAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [subject, records] = await Promise.all([
    getSubjectById(id),
    getAttendanceRecordsBySubjectId(id),
  ]);

  if (!subject) {
    notFound();
  }

  // 出席・欠席の集計
  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  // upsertAttendanceRecord(subjectId, prevState, formData) を bind で部分適用
  const boundUpsert = upsertAttendanceRecord.bind(null, id);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← {subject.name} の詳細に戻る
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">出席の記録</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="text-emerald-700 font-medium">出席 {presentCount} 回</span>
          <span className="text-red-700 font-medium">欠席 {absentCount} 回</span>
        </div>
      </div>

      {/* 入力フォーム */}
      <AttendanceForm action={boundUpsert} />

      {/* 記録一覧 */}
      {records.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだ出席記録はありません。上のフォームから記録してください。
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">授業日</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">メモ</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {record.classDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[record.status] ?? ""}`}
                    >
                      {STATUS_LABEL[record.status] ?? record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {record.memo ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeleteAttendanceButton
                      subjectId={id}
                      recordId={record.id}
                      classDate={record.classDate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
