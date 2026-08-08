"use server";

import { revalidatePath } from "next/cache";
import { parseTestRecordFormData } from "@/lib/grades/testRecordFormData";
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
  unauthenticated: "ログインの有効期限が切れています。再度ログインしてください。",
  not_found: "対象の記録が見つかりません。画面を再読み込みしてください。",
  forbidden: "この記録を操作する権限がありません。",
  invalid_score: "得点が満点を超えているか、不正な値です。入力値を確認してください。",
  missing_max_score: "評価項目に満点が設定されていません。評価方法を編集してください。",
  unknown: "保存に失敗しました。時間をおいて再度お試しください。",
};

function toFailure(message: string): TestRecordFormState {
  return { fieldErrors: {}, message, success: false };
}

/** 保存・削除後に、集計を表示する画面のキャッシュをまとめて再検証する。 */
function revalidateTestRecordViews(subjectId: string) {
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath(`/subjects/${subjectId}/tests`);
  revalidatePath("/dashboard");
}

/**
 * 対象科目が本人のものかを確認し、評価項目の満点を返す。
 * 満点は得点の上限検証に使う。
 */
async function getMaxScore(
  subjectId: string,
  gradeItemId: string,
): Promise<
  { ok: true; maxScore: number | null } | { ok: false; message: string }
> {
  const subject = await getSubject(subjectId);

  if (!subject.ok) {
    if (subject.error === "unauthenticated") {
      return { ok: false, message: ERROR_MESSAGES.unauthenticated };
    }

    // 他ユーザーの科目はRLSにより not_found として返るため、存在の有無を区別しない。
    return { ok: false, message: "対象の科目が見つかりません。" };
  }

  const gradeItem = subject.gradeItems.find((item) => item.id === gradeItemId);

  if (!gradeItem) {
    return { ok: false, message: "選択された評価項目がこの科目に存在しません。" };
  }

  return { ok: true, maxScore: gradeItem.maxScore };
}

/**
 * 得点記録を登録または更新する。
 * recordId が空なら新規登録、指定されていればその記録を更新する。
 * subjectId は画面で固定してActionへ束縛し、フォーム入力からは差し替えられない。
 */
export async function saveTestRecordAction(
  subjectId: string,
  _prevState: TestRecordFormState,
  formData: FormData,
): Promise<TestRecordFormState> {
  void _prevState;

  const parsed = parseTestRecordFormData(formData);
  if (!parsed.ok) {
    return toFailure("送信内容を読み取れませんでした。画面を再読み込みしてください。");
  }

  const ownership = await getMaxScore(subjectId, parsed.values.gradeItemId);
  if (!ownership.ok) {
    return toFailure(ownership.message);
  }

  // クライアント側と同じ規則で検証する。フォームの検証は迂回できるため、
  // ここでの検証結果だけを保存の可否の判断に使う。
  const fieldErrors = validateTestRecordForm(parsed.values, ownership.maxScore);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: "入力内容を確認してください。", success: false };
  }

  const memo = parsed.values.memo.trim() === "" ? null : parsed.values.memo.trim();
  const score = Number(parsed.values.score);

  const result =
    parsed.values.recordId.trim() === ""
      ? await createTestRecord({
          gradeItemId: parsed.values.gradeItemId,
          score,
          recordedAt: parsed.values.recordedAt,
          memo,
        })
      : await updateTestRecord(parsed.values.recordId, {
          score,
          recordedAt: parsed.values.recordedAt,
          memo,
        });

  if (!result.ok) {
    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidateTestRecordViews(subjectId);

  return { fieldErrors: {}, message: null, success: true };
}

/**
 * 得点記録を削除する。
 * 他ユーザーの記録IDを指定した場合はRLSにより not_found になる。
 */
export async function deleteTestRecordAction(
  subjectId: string,
  _prevState: TestRecordFormState,
  formData: FormData,
): Promise<TestRecordFormState> {
  void _prevState;

  const recordId = formData.get("recordId");

  if (typeof recordId !== "string" || recordId.trim() === "") {
    return toFailure("削除対象の記録が指定されていません。");
  }

  const result = await deleteTestRecord(recordId);

  if (!result.ok) {
    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidateTestRecordViews(subjectId);

  return { fieldErrors: {}, message: null, success: true };
}
