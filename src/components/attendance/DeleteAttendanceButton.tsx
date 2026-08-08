"use client";

import { useActionState, type FormEvent } from "react";
import { deleteAttendanceAction } from "@/app/subjects/[id]/attendance/actions";
import { Button } from "@/components/ui/Button";
import { initialAttendanceFormState } from "@/lib/attendance/attendanceFormState";

interface DeleteAttendanceButtonProps {
  recordId: string;
  subjectId: string;
  classDate: string;
}

/** 出席記録を確認付きで削除する。 */
export function DeleteAttendanceButton({
  recordId,
  subjectId,
  classDate,
}: DeleteAttendanceButtonProps) {
  const [state, formAction, pending] = useActionState(
    deleteAttendanceAction,
    initialAttendanceFormState,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`${classDate} の記録を削除します。よろしいですか？`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="subjectId" value={subjectId} />
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
