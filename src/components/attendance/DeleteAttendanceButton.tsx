"use client";

import { useTransition } from "react";
import { deleteAttendanceRecord } from "@/app/actions/attendance";

interface Props {
  subjectId: string;
  recordId: string;
  classDate: string;
}

export function DeleteAttendanceButton({ subjectId, recordId, classDate }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`${classDate} の出席記録を削除しますか？`)) return;
    startTransition(async () => {
      try {
        await deleteAttendanceRecord(subjectId, recordId);
      } catch {
        alert("削除に失敗しました");
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium border border-transparent hover:border-red-200 transition-colors disabled:opacity-50"
    >
      {isPending ? "削除中…" : "削除"}
    </button>
  );
}
