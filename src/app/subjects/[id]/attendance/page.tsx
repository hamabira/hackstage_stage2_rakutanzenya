import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceManager } from "@/components/attendance/AttendanceManager";
import { Card } from "@/components/ui/Card";
import { summarizeAttendanceRecords } from "@/lib/attendance/attendanceSummary";
import { getAttendanceRecords } from "@/lib/supabase/queries/attendance";
import { getSubject } from "@/lib/supabase/queries/subjects";

export default async function SubjectAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subjectResult = await getSubject(id);

  // 他ユーザーの科目はRLSにより not_found となるため、存在の有無を区別しない。
  if (!subjectResult.ok) {
    notFound();
  }

  const attendanceResult = await getAttendanceRecords(id);
  const records = attendanceResult.ok ? attendanceResult.records : [];
  const summary = summarizeAttendanceRecords(records);

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← 科目詳細に戻る
      </Link>

      <div>
        <h1 className="text-xl font-semibold">出席の記録</h1>
        <p className="mt-1 text-sm text-gray-600">{subjectResult.subject.name}</p>
      </div>

      {attendanceResult.ok ? null : (
        <Card className="border-red-300 bg-red-50">
          <p className="text-sm text-red-700" role="alert">
            出席記録の取得に失敗しました。時間をおいて画面を再読み込みしてください。
          </p>
        </Card>
      )}

      <Card>
        <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-600">
          <div className="flex gap-2">
            <dt>出席</dt>
            <dd>{summary.statusCounts.present} 回</dd>
          </div>
          <div className="flex gap-2">
            <dt>欠席</dt>
            <dd>{summary.statusCounts.absent} 回</dd>
          </div>
          <div className="flex gap-2">
            <dt>遅刻</dt>
            <dd>{summary.statusCounts.late} 回</dd>
          </div>
          <div className="flex gap-2">
            <dt>公欠</dt>
            <dd>{summary.statusCounts.excused} 回</dd>
          </div>
          <div className="flex gap-2">
            <dt>記録済み / 総授業回数</dt>
            <dd>
              {summary.recordedCount} / {subjectResult.subject.totalClassCount ?? "未設定"} 回
            </dd>
          </div>
        </dl>
      </Card>

      <AttendanceManager records={records} subjectId={id} />
    </div>
  );
}
