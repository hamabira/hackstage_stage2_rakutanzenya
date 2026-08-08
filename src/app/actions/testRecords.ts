"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface TestRecordMutationState {
  error: string | null;
  /** 保存に成功した直後、フォームをリセットするためのキー */
  resetKey?: number;
}

// ─────────────────────────────────────────
// テスト・課題記録の追加
// ─────────────────────────────────────────

export async function createTestRecord(
  subjectId: string,
  gradeItemId: string,
  maxScore: number,
  prevState: TestRecordMutationState,
  formData: FormData,
): Promise<TestRecordMutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証されていません" };
  }

  const scoreRaw = formData.get("score") as string | null;
  const recordedAt = (formData.get("recordedAt") as string | null)?.trim();
  const memo = (formData.get("memo") as string | null)?.trim() || null;

  if (!scoreRaw || scoreRaw.trim() === "") {
    return { error: "点数を入力してください" };
  }

  const score = parseFloat(scoreRaw);
  if (Number.isNaN(score) || score < 0 || score > maxScore) {
    return { error: `点数は 0 〜 ${maxScore} の範囲で入力してください` };
  }

  if (!recordedAt) {
    return { error: "記録日を入力してください" };
  }

  const { error } = await supabase.from("test_records").insert({
    grade_item_id: gradeItemId,
    user_id: user.id,
    score,
    recorded_at: recordedAt,
    memo,
  });

  if (error) {
    console.error("TestRecord insert error:", error);
    return { error: "点数の保存に失敗しました" };
  }

  revalidatePath(`/subjects/${subjectId}/tests`);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
  return { error: null, resetKey: Date.now() };
}

// ─────────────────────────────────────────
// テスト・課題記録の更新
// ─────────────────────────────────────────

export async function updateTestRecord(
  subjectId: string,
  recordId: string,
  maxScore: number,
  prevState: TestRecordMutationState,
  formData: FormData,
): Promise<TestRecordMutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証されていません" };
  }

  const scoreRaw = formData.get("score") as string | null;
  const recordedAt = (formData.get("recordedAt") as string | null)?.trim();
  const memo = (formData.get("memo") as string | null)?.trim() || null;

  if (!scoreRaw || scoreRaw.trim() === "") {
    return { error: "点数を入力してください" };
  }

  const score = parseFloat(scoreRaw);
  if (Number.isNaN(score) || score < 0 || score > maxScore) {
    return { error: `点数は 0 〜 ${maxScore} の範囲で入力してください` };
  }

  if (!recordedAt) {
    return { error: "記録日を入力してください" };
  }

  const { error } = await supabase
    .from("test_records")
    .update({ score, recorded_at: recordedAt, memo })
    .eq("id", recordId)
    .eq("user_id", user.id);

  if (error) {
    console.error("TestRecord update error:", error);
    return { error: "点数の更新に失敗しました" };
  }

  revalidatePath(`/subjects/${subjectId}/tests`);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

// ─────────────────────────────────────────
// テスト・課題記録の削除
// ─────────────────────────────────────────

export async function deleteTestRecord(
  subjectId: string,
  recordId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証されていません");
  }

  const { error } = await supabase
    .from("test_records")
    .delete()
    .eq("id", recordId)
    .eq("user_id", user.id);

  if (error) {
    console.error("TestRecord delete error:", error);
    throw new Error("点数記録の削除に失敗しました");
  }

  revalidatePath(`/subjects/${subjectId}/tests`);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
}
