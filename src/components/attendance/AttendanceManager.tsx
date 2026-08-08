"use client";

import { useCallback, useState } from "react";
import {
  AttendanceForm,
  type AttendanceFormValue,
} from "@/components/attendance/AttendanceForm";
import { AttendanceRecordList } from "@/components/attendance/AttendanceRecordList";
import { Card } from "@/components/ui/Card";
import type { AttendanceRecord } from "@/lib/types/domain";

interface AttendanceManagerProps {
  subjectId: string;
  records: AttendanceRecord[];
}

const EMPTY_VALUE: AttendanceFormValue = {
  classDate: "",
  status: "present",
  memo: "",
};

/**
 * 出席記録の入力フォームと一覧をつなぐ。
 * 一覧の「編集」を押すと、その記録の値をフォームへ読み込む。
 * 保存は同一授業日をキーにした上書きのため、日付を変えずに保存すれば修正になる。
 */
export function AttendanceManager({ subjectId, records }: AttendanceManagerProps) {
  const [value, setValue] = useState<AttendanceFormValue>(EMPTY_VALUE);

  const handleChange = useCallback((next: AttendanceFormValue) => {
    setValue(next);
  }, []);

  function handleEdit(record: AttendanceRecord) {
    setValue({
      classDate: record.classDate,
      status: record.status,
      memo: record.memo ?? "",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-medium">出席を記録する</h2>
        <div className="mt-4">
          <AttendanceForm
            onChange={handleChange}
            recordedDates={records.map((record) => record.classDate)}
            subjectId={subjectId}
            value={value}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-medium">記録一覧({records.length}件)</h2>
        <div className="mt-4">
          <AttendanceRecordList
            onEdit={handleEdit}
            records={records}
            subjectId={subjectId}
          />
        </div>
      </Card>
    </div>
  );
}
