"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateSubjectForm } from "@/components/subjects/subjectFormValidation";
import { parseSubjectFormData } from "@/lib/subjects/subjectFormData";
import type { SubjectFormState } from "@/lib/subjects/subjectFormState";
import { toCreateSubjectInput } from "@/lib/subjects/subjectInput";
import { createSubject, type CreateSubjectError } from "@/lib/supabase/queries/subjects";

const ERROR_MESSAGES: Record<CreateSubjectError, string> = {
  unauthenticated: "ログインの有効期限が切れています。再度ログインしてください。",
  constraint_violation: "入力内容がDBの制約に違反しています。入力値を確認してください。",
  unknown: "保存に失敗しました。時間をおいて再度お試しください。",
};

function toFailure(message: string): SubjectFormState {
  return { fieldErrors: {}, message };
}

/**
 * 科目登録フォームの送信を受け取り、検証してから保存する。
 * 失敗時はフィールドエラーを返し、フォーム側が入力値を保持したまま再表示する。
 */
export async function createSubjectAction(
  _prevState: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const parsed = parseSubjectFormData(formData);
  if (!parsed.ok) {
    return toFailure("送信内容を読み取れませんでした。画面を再読み込みしてください。");
  }

  // クライアント側と同じ規則で検証する。フォームの検証は迂回できるため、
  // ここでの検証結果だけを保存の可否の判断に使う。
  const fieldErrors = validateSubjectForm(parsed.values);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: "入力内容を確認してください。" };
  }

  const result = await createSubject(toCreateSubjectInput(parsed.values));

  if (!result.ok) {
    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidatePath("/subjects");
  revalidatePath("/dashboard");

  // redirect は内部でエラーを投げるため、必ず try/catch の外で呼ぶ。
  redirect(`/subjects/${result.subjectId}`);
}
