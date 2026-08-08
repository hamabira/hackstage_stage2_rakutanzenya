"use client";

import { useActionState } from "react";
import { updateSubjectAction } from "@/app/subjects/[id]/edit/actions";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { initialSubjectFormState } from "@/lib/subjects/subjectFormState";
import type { GradeItem, Subject } from "@/lib/types/domain";

interface EditSubjectFormProps {
  subject: Subject;
  gradeItems: GradeItem[];
}

/**
 * 科目編集フォームと更新Actionを繋ぐ。
 * subjectId はサーバー側で束縛するため、フォームの入力からは変更できない。
 */
export function EditSubjectForm({ subject, gradeItems }: EditSubjectFormProps) {
  const updateAction = updateSubjectAction.bind(null, subject.id);
  const [state, formAction, pending] = useActionState(
    updateAction,
    initialSubjectFormState,
  );

  return (
    <div className="flex flex-col gap-4">
      {state.message === null ? null : (
        <p
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <SubjectForm
        action={formAction}
        gradeItems={gradeItems}
        pending={pending}
        serverErrors={state.fieldErrors}
        subject={subject}
      />
    </div>
  );
}
