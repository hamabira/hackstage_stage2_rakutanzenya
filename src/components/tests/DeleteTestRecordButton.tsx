"use client";

import { useTransition } from "react";
import { deleteTestRecord } from "@/app/actions/testRecords";

interface Props {
  subjectId: string;
  recordId: string;
  label: string;
}

export function DeleteTestRecordButton({ subjectId, recordId, label }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`「${label}」の点数記録を削除しますか？`)) return;
    startTransition(async () => {
      try {
        await deleteTestRecord(subjectId, recordId);
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
