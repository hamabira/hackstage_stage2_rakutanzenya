"use client";

import { useActionState, type FormEvent } from "react";
import { deleteTestRecordAction } from "@/app/subjects/[id]/tests/actions";
import { Button } from "@/components/ui/Button";
import { initialTestRecordFormState } from "@/lib/grades/testRecordFormState";

interface DeleteTestRecordButtonProps {
  recordId: string;
  subjectId: string;
  label: string;
}

/** 得点記録を確認付きで削除する。 */
export function DeleteTestRecordButton({
  recordId,
  subjectId,
  label,
}: DeleteTestRecordButtonProps) {
  const [state, formAction, pending] = useActionState(
    deleteTestRecordAction,
    initialTestRecordFormState,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`${label} の記録を削除します。よろしいですか？`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      {/* Action は科目IDをFormDataから受け取る。画面固定の値をhiddenで送る。 */}
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="recordId" value={recordId} />
      <Button
        className="border bg-white text-red-700"
        disabled={pending}
        type="submit"
        variant="secondary"
      >
        {pending ? "削除中…" : "削除"}
      </Button>
      {state.message ? (
        <p className="mt-1 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
