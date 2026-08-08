"use client";

import { useActionState } from "react";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import type { Subject, GradeItem } from "@/lib/types/domain";
import type { SubjectMutationState } from "@/app/actions/subjects";

interface SubjectFormWrapperProps {
  action: (
    prevState: SubjectMutationState,
    formData: FormData,
  ) => Promise<SubjectMutationState>;
  subject?: Subject;
  gradeItems?: Pick<
    GradeItem,
    "name" | "category" | "weight" | "maxScore" | "sortOrder"
  >[];
}

const initialState: SubjectMutationState = { error: null };

export function SubjectFormWrapper({
  action,
  subject,
  gradeItems,
}: SubjectFormWrapperProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-4">
      {state.error && (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <SubjectForm
        action={formAction}
        pending={isPending}
        subject={subject}
        gradeItems={gradeItems}
      />
    </div>
  );
}
