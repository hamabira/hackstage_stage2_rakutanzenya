"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateSubjectForm } from "@/components/subjects/subjectFormValidation";
import type { DeleteSubjectFormState } from "@/lib/subjects/deleteSubjectFormState";
import { parseSubjectFormData } from "@/lib/subjects/subjectFormData";
import type { SubjectFormState } from "@/lib/subjects/subjectFormState";
import { toUpdateSubjectInput } from "@/lib/subjects/subjectInput";
import {
  deleteSubject,
  updateSubject,
  type SubjectQueryError,
} from "@/lib/supabase/queries/subjects";

const ERROR_MESSAGES: Record<SubjectQueryError, string> = {
  unauthenticated: "ログインの有効期限が切れています。もう一度ログインしてください。",
  not_found: "対象の科目が見つかりません。画面を再読み込みしてください。",
  forbidden: "この科目を削除する権限がありません。",
  constraint_violation: "関連データの整合性を確認してから、もう一度お試しください。",
  unknown: "削除に失敗しました。時間をおいて再度お試しください。",
};

const UPDATE_ERROR_MESSAGES: Record<SubjectQueryError, string> = {
  unauthenticated: "ログインの有効期限が切れています。もう一度ログインしてください。",
  not_found: "対象の科目が見つかりません。画面を再読み込みしてください。",
  forbidden: "この科目を更新する権限がありません。",
  constraint_violation: "入力内容がDBの制約に違反しています。入力値を確認してください。",
  unknown: "更新に失敗しました。時間をおいて再度お試しください。",
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

/**
 * 科目編集フォームの送信を受け取り、検証してから更新する。
 * subjectIdは画面で固定してActionへ束縛し、所有権の確認はクエリとRLSに任せる。
 * 送信されなかった評価項目は、更新処理側で削除対象として扱われる。
 */
export async function updateSubjectAction(
  subjectId: string,
  _prevState: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  void _prevState;

  const parsed = parseSubjectFormData(formData);
  if (!parsed.ok) {
    return {
      fieldErrors: {},
      message: "送信内容を読み取れませんでした。画面を再読み込みしてください。",
    };
  }

  // クライアント側と同じ規則で検証する。フォームの検証は迂回できるため、
  // ここでの検証結果だけを保存の可否の判断に使う。
  const fieldErrors = validateSubjectForm(parsed.values);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: "入力内容を確認してください。" };
  }

  const result = await updateSubject(subjectId, toUpdateSubjectInput(parsed.values));
  if (!result.ok) {
    return { fieldErrors: {}, message: UPDATE_ERROR_MESSAGES[result.error] };
  }

  revalidateSubjectViews(subjectId);

  // redirect は内部でエラーを投げるため、必ず try/catch の外で呼ぶ。
  redirect(`/subjects/${subjectId}`);
}
