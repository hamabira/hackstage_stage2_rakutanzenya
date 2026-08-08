"use client";

import { DeleteAttendanceButton } from "@/components/attendance/DeleteAttendanceButton";
import { Button } from "@/components/ui/Button";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/attendanceFormValidation";
import type { AttendanceRecord } from "@/lib/types/domain";

interface AttendanceRecordListProps {
  records: AttendanceRecord[];
  subjectId: string;
  onEdit: (record: AttendanceRecord) => void;
}

/** 保存済みの出席記録を日付順に並べ、編集・削除の操作を提供する。 */
export function AttendanceRecordList({
  records,
  subjectId,
  onEdit,
}: AttendanceRecordListProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        まだ出席記録がありません。上のフォームから記録してください。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {records.map((record) => (
        <li
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          key={record.id}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{record.classDate}</span>
              <span>{ATTENDANCE_STATUS_LABELS[record.status]}</span>
            </div>
            {record.memo ? (
              <p className="text-sm text-gray-600">{record.memo}</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              className="border bg-white text-gray-800"
              onClick={() => onEdit(record)}
              type="button"
              variant="secondary"
            >
              編集
            </Button>
            <DeleteAttendanceButton
              classDate={record.classDate}
              recordId={record.id}
              subjectId={subjectId}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
