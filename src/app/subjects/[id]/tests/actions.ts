"use server";

import { revalidatePath } from "next/cache";
import {
  parseDeleteTestRecordFormData,
  parseTestRecordFormData,
} from "@/lib/grades/testRecordFormData";
import type { TestRecordFormState } from "@/lib/grades/testRecordFormState";
import { validateTestRecordForm } from "@/lib/grades/testRecordFormValidation";
import {
  createTestRecord,
  deleteTestRecord,
  updateTestRecord,
  type TestRecordQueryError,
} from "@/lib/supabase/queries/grades";
import { getSubject } from "@/lib/supabase/queries/subjects";

const ERROR_MESSAGES: Record<TestRecordQueryError, string> = {
  unauthenticated: "ログインの有効期限が切れています。もう一度ログインしてください。",
  not_found: "対象の点数記録または評価項目が見つかりません。画面を再読み込みしてください。",
  forbidden: "この点数記録を操作する権限がありません。",
  invalid_score: "点数は0以上かつ評価項目の満点以下で入力してください。",
  missing_max_score: "評価項目の満点が未設定のため、点数を保存できません。",
  unknown: "保存に失敗しました。時間をおいて再度お試しください。",
};

function toFailure(message: string, fieldErrors = {}): TestRecordFormState {
  return { fieldErrors, message, success: false };
}

/** 点数の変更を科目詳細・点数記録画面・ダッシュボードへ反映する。 */
function revalidateTestRecordViews(subjectId: string) {
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath(`/subjects/${subjectId}/tests`);
  revalidatePath("/dashboard");
}

/** 本人の科目と、その科目に属する評価項目を取得する。 */
async function getOwnedGradeItem(subjectId: string, gradeItemId: string) {
  const subjectResult = await getSubject(subjectId);

  if (!subjectResult.ok) {
    return {
      ok: false as const,
      message:
        subjectResult.error === "unauthenticated"
          ? ERROR_MESSAGES.unauthenticated
          : "対象の科目が見つかりません。画面を再読み込みしてください。",
    };
  }

  const gradeItem = subjectResult.gradeItems.find((item) => item.id === gradeItemId);
  if (!gradeItem) {
    return { ok: false as const, message: "選択した評価項目はこの科目に含まれていません。" };
  }

  return { ok: true as const, gradeItem };
}

/** 点数記録を登録または更新する。recordIdが空なら新規登録として扱う。 */
export async function saveTestRecordAction(
  _prevState: TestRecordFormState,
  formData: FormData,
): Promise<TestRecordFormState> {
  const parsed = parseTestRecordFormData(formData);
  if (!parsed.ok) {
    return toFailure("送信内容を読み取れませんでした。画面を再読み込みしてください。");
  }

  const fieldErrors = validateTestRecordForm(parsed.values);
  if (Object.keys(fieldErrors).length > 0) {
    return toFailure("入力内容を確認してください。", fieldErrors);
  }

  const gradeItemResult = await getOwnedGradeItem(parsed.values.subjectId, parsed.values.gradeItemId);
  if (!gradeItemResult.ok) {
    return toFailure(gradeItemResult.message);
  }

  const score = Number(parsed.values.score);
  if (gradeItemResult.gradeItem.maxScore === null) {
    return toFailure("入力内容を確認してください。", {
      gradeItemId: ERROR_MESSAGES.missing_max_score,
    });
  }

  if (score > gradeItemResult.gradeItem.maxScore) {
    return toFailure("入力内容を確認してください。", { score: ERROR_MESSAGES.invalid_score });
  }

  const input = {
    score,
    recordedAt: parsed.values.recordedAt,
    memo: parsed.values.memo.trim() === "" ? null : parsed.values.memo.trim(),
  };
  const result =
    parsed.values.recordId.trim() === ""
      ? await createTestRecord({ ...input, gradeItemId: parsed.values.gradeItemId })
      : await updateTestRecord(parsed.values.recordId, input);

  if (!result.ok) {
    if (result.error === "invalid_score") {
      return toFailure("入力内容を確認してください。", { score: ERROR_MESSAGES.invalid_score });
    }

    if (result.error === "missing_max_score") {
      return toFailure("入力内容を確認してください。", {
        gradeItemId: ERROR_MESSAGES.missing_max_score,
      });
    }

    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidateTestRecordViews(parsed.values.subjectId);
  return { fieldErrors: {}, message: null, success: true };
}

/** 自分の点数記録を削除する。削除前の確認操作はUI側で行う。 */
export async function deleteTestRecordAction(
  _prevState: TestRecordFormState,
  formData: FormData,
): Promise<TestRecordFormState> {
  const parsed = parseDeleteTestRecordFormData(formData);
  if (!parsed.ok) {
    return toFailure("送信内容を読み取れませんでした。画面を再読み込みしてください。");
  }

  if (parsed.subjectId.trim() === "" || parsed.recordId.trim() === "") {
    return toFailure("削除対象の点数記録が指定されていません。");
  }

  const subjectResult = await getSubject(parsed.subjectId);
  if (!subjectResult.ok) {
    return toFailure(
      subjectResult.error === "unauthenticated"
        ? ERROR_MESSAGES.unauthenticated
        : "対象の科目が見つかりません。画面を再読み込みしてください。",
    );
  }

  const result = await deleteTestRecord(parsed.recordId);
  if (!result.ok) {
    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidateTestRecordViews(parsed.subjectId);
  return { fieldErrors: {}, message: null, success: true };
}
