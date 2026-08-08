"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DeleteSubjectFormState } from "@/lib/subjects/deleteSubjectFormState";
import {
  deleteSubject,
  type SubjectQueryError,
} from "@/lib/supabase/queries/subjects";

const ERROR_MESSAGES: Record<SubjectQueryError, string> = {
  unauthenticated: "ログインの有効期限が切れています。もう一度ログインしてください。",
  not_found: "対象の科目が見つかりません。画面を再読み込みしてください。",
  forbidden: "この科目を削除する権限がありません。",
  constraint_violation: "関連データの整合性を確認してから、もう一度お試しください。",
  unknown: "削除に失敗しました。時間をおいて再度お試しください。",
};

/** 削除後に古い科目情報が表示されないよう、関連画面を再検証する。 */
function revalidateSubjectViews(subjectId: string) {
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath(`/subjects/${subjectId}/edit`);
}

/**
 * 科目削除フォームを処理する。
 * subjectIdは画面で固定してActionへ束縛し、所有権の最終確認はクエリとRLSに任せる。
 */
export async function deleteSubjectAction(
  subjectId: string,
  _prevState: DeleteSubjectFormState,
  _formData: FormData,
): Promise<DeleteSubjectFormState> {
  void _prevState;
  void _formData;

  if (subjectId.trim() === "") {
    return { message: "削除対象の科目が指定されていません。" };
  }

  const result = await deleteSubject(subjectId);
  if (!result.ok) {
    return { message: ERROR_MESSAGES[result.error] };
  }

  revalidateSubjectViews(subjectId);
  redirect("/subjects");
}
