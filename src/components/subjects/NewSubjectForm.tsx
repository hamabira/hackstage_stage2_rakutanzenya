"use client";

import { useActionState, useState } from "react";
import { createSubjectAction } from "@/app/subjects/new/actions";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { SubjectImportPanel } from "@/components/subjects/SubjectImportPanel";
import { SubjectImportResult } from "@/components/subjects/SubjectImportResult";
import type { SubjectImportDraft } from "@/lib/subject-import/types";
import { initialSubjectFormState } from "@/lib/subjects/subjectFormState";

/**
 * 科目登録フォームと保存Actionを繋ぐ。
 * 保存中はpendingでボタンを無効化し、二重送信を防ぐ。
 * AI解析の下書きはここで保持し、届いたときだけフォームを作り直して反映する。
 */
export function NewSubjectForm() {
  const [state, formAction, pending] = useActionState(
    createSubjectAction,
    initialSubjectFormState,
  );
  const [draft, setDraft] = useState<SubjectImportDraft | null>(null);
  // 解析成功時だけ増やす。保存の検証エラーでは作り直さず、入力値を残す。
  const [draftVersion, setDraftVersion] = useState(0);

  function handleDraft(nextDraft: SubjectImportDraft) {
    setDraft(nextDraft);
    setDraftVersion((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <SubjectImportPanel onDraft={handleDraft} />

      {draft === null ? null : (
        <SubjectImportResult notes={draft.notes} warnings={draft.warnings} />
      )}

      {state.message === null ? null : (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}

      <SubjectForm
        action={formAction}
        initialValues={draft?.values}
        key={`subject-form-${draftVersion}`}
        pending={pending}
        serverErrors={state.fieldErrors}
      />
    </div>
  );
}
