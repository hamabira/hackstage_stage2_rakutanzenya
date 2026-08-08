"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────
// 出席記録の追加・更新
// ─────────────────────────────────────────

export interface AttendanceMutationState {
  error: string | null;
}

export async function upsertAttendanceRecord(
  subjectId: string,
  prevState: AttendanceMutationState,
  formData: FormData,
): Promise<AttendanceMutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証されていません" };
  }

  const classDate = (formData.get("classDate") as string | null)?.trim();
  const status = formData.get("status") as string | null;
  const memo =
    (formData.get("memo") as string | null)?.trim() || null;

  if (!classDate) {
    return { error: "授業日を入力してください" };
  }
  if (status !== "present" && status !== "absent") {
    return { error: "出席状態を選択してください" };
  }

  // DBのユニーク制約 (subject_id, class_date) を利用して UPSERT する
  const { error } = await supabase.from("attendance_records").upsert(
    {
      subject_id: subjectId,
      user_id: user.id,
      class_date: classDate,
      status,
      memo,
    },
    { onConflict: "subject_id,class_date" },
  );

  if (error) {
    console.error("Attendance upsert error:", error);
    return { error: "出席記録の保存に失敗しました" };
  }

  revalidatePath(`/subjects/${subjectId}/attendance`);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

// ─────────────────────────────────────────
// 出席記録の削除
// ─────────────────────────────────────────

export async function deleteAttendanceRecord(
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
    .from("attendance_records")
    .delete()
    .eq("id", recordId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Attendance delete error:", error);
    throw new Error("出席記録の削除に失敗しました");
  }

  revalidatePath(`/subjects/${subjectId}/attendance`);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
}
