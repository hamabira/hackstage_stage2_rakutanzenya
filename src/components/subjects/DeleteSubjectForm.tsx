"use client";

import { type FormEvent, useActionState } from "react";
import { deleteSubjectAction } from "@/app/subjects/[id]/edit/actions";
import { Button } from "@/components/ui/Button";
import { initialDeleteSubjectFormState } from "@/lib/subjects/deleteSubjectFormState";

interface DeleteSubjectFormProps {
  subjectId: string;
  subjectName: string;
}

/** 科目名を表示した確認操作の後に、科目削除Actionを送信するフォーム。 */
export function DeleteSubjectForm({ subjectId, subjectName }: DeleteSubjectFormProps) {
  const deleteAction = deleteSubjectAction.bind(null, subjectId);
  const [state, formAction, pending] = useActionState(
    deleteAction,
    initialDeleteSubjectFormState,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `「${subjectName}」を削除しますか？\n評価項目・出席記録・点数記録もすべて削除され、この操作は取り消せません。`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col items-start gap-3">
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="border-red-600 text-red-700"
      >
        {pending ? "削除中..." : "この科目を削除"}
      </Button>
      {state.message === null ? null : (
        <p className="text-sm text-red-700" role="alert" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
