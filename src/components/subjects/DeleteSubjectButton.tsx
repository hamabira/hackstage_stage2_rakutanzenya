"use client";

import { useTransition } from "react";
import { deleteSubject } from "@/app/actions/subjects";

export function DeleteSubjectButton({ subjectId, subjectName }: { subjectId: string, subjectName: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`「${subjectName}」を本当に削除しますか？\n（関連する評価項目や記録もすべて削除されます）`)) {
      startTransition(async () => {
        try {
          await deleteSubject(subjectId);
        } catch (error) {
          alert("削除に失敗しました。");
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium border border-transparent hover:border-red-200 transition-colors disabled:opacity-50"
    >
      {isPending ? "削除中..." : "削除"}
    </button>
  );
}
