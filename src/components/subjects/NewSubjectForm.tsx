"use client";

import { useActionState } from "react";
import { createSubjectAction } from "@/app/subjects/new/actions";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { initialSubjectFormState } from "@/lib/subjects/subjectFormState";

/**
 * 科目登録フォームと保存Actionを繋ぐ。
 * 保存中はpendingでボタンを無効化し、二重送信を防ぐ。
 */
export function NewSubjectForm() {
  const [state, formAction, pending] = useActionState(
    createSubjectAction,
    initialSubjectFormState,
  );

  return (
    <div className="flex flex-col gap-4">
      {state.message === null ? null : (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <SubjectForm action={formAction} pending={pending} serverErrors={state.fieldErrors} />
    </div>
  );
}
