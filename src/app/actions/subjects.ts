"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GradeItemCategory } from "@/lib/types/domain";

// ─────────────────────────────────────────
// FormData パースユーティリティ
// ─────────────────────────────────────────

/** SubjectForm が送信する gradeItems[index][field] 形式を配列へ変換する。 */
function parseGradeItemsFromFormData(
  formData: FormData,
  subjectId: string,
): Array<{
  subject_id: string;
  name: string;
  category: GradeItemCategory;
  weight: number;
  max_score: number | null;
  sort_order: number;
}> {
  const items = [];
  let index = 0;

  while (formData.has(`gradeItems[${index}][name]`)) {
    const name = (formData.get(`gradeItems[${index}][name]`) as string).trim();
    const category = formData.get(
      `gradeItems[${index}][category]`,
    ) as GradeItemCategory;
    const weight = parseFloat(
      formData.get(`gradeItems[${index}][weight]`) as string,
    );
    const maxScoreRaw = formData.get(
      `gradeItems[${index}][maxScore]`,
    ) as string;
    const maxScore = maxScoreRaw ? parseFloat(maxScoreRaw) : null;

    if (name && category && !Number.isNaN(weight)) {
      items.push({
        subject_id: subjectId,
        name,
        category,
        weight,
        max_score: maxScore,
        sort_order: index,
      });
    }
    index++;
  }

  return items;
}

/** 科目フィールドを FormData から取り出す。 */
function parseSubjectFields(formData: FormData) {
  return {
    name: (formData.get("name") as string | null)?.trim() ?? "",
    totalClassCount: formData.get("totalClassCount")
      ? parseInt(formData.get("totalClassCount") as string, 10)
      : null,
    attendanceRequiredRate: formData.get("attendanceRequiredRate")
      ? parseFloat(formData.get("attendanceRequiredRate") as string)
      : null,
    attendanceMaxAbsences: formData.get("attendanceMaxAbsences")
      ? parseInt(formData.get("attendanceMaxAbsences") as string, 10)
      : null,
    attendanceAffectsGrade: formData.get("attendanceAffectsGrade") === "true",
    targetGradeLabel:
      (formData.get("targetGradeLabel") as string | null)?.trim() || null,
    targetScore: formData.get("targetScore")
      ? parseFloat(formData.get("targetScore") as string)
      : null,
  };
}

// ─────────────────────────────────────────
// 科目作成
// ─────────────────────────────────────────

export interface SubjectMutationState {
  error: string | null;
}

export async function createSubject(
  prevState: SubjectMutationState,
  formData: FormData,
): Promise<SubjectMutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証されていません" };
  }

  const fields = parseSubjectFields(formData);

  if (!fields.name) {
    return { error: "科目名は必須です" };
  }

  const { data: subjectData, error: subjectError } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      name: fields.name,
      total_class_count: fields.totalClassCount,
      attendance_required_rate: fields.attendanceRequiredRate,
      attendance_max_absences: fields.attendanceMaxAbsences,
      attendance_affects_grade: fields.attendanceAffectsGrade,
      target_grade_label: fields.targetGradeLabel,
      target_score: fields.targetScore,
    })
    .select("id")
    .single();

  if (subjectError || !subjectData) {
    console.error("Subject creation error:", subjectError);
    return { error: `科目の保存に失敗しました（${subjectError?.message ?? "不明"}）` };
  }

  const gradeItems = parseGradeItemsFromFormData(formData, subjectData.id);

  if (gradeItems.length > 0) {
    const { error: gradeItemsError } = await supabase
      .from("grade_items")
      .insert(gradeItems);

    if (gradeItemsError) {
      console.error("Grade items creation error:", gradeItemsError);
      // 科目は作成済みのためロールバック（削除）してエラーを返す
      await supabase.from("subjects").delete().eq("id", subjectData.id);
      return { error: `評価項目の保存に失敗しました（${gradeItemsError.message}）` };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/subjects");
  redirect(`/subjects/${subjectData.id}`);
}

// ─────────────────────────────────────────
// 科目更新
// ─────────────────────────────────────────

export async function updateSubject(
  subjectId: string,
  prevState: SubjectMutationState,
  formData: FormData,
): Promise<SubjectMutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証されていません" };
  }

  const fields = parseSubjectFields(formData);

  if (!fields.name) {
    return { error: "科目名は必須です" };
  }

  const { error: updateError } = await supabase
    .from("subjects")
    .update({
      name: fields.name,
      total_class_count: fields.totalClassCount,
      attendance_required_rate: fields.attendanceRequiredRate,
      attendance_max_absences: fields.attendanceMaxAbsences,
      attendance_affects_grade: fields.attendanceAffectsGrade,
      target_grade_label: fields.targetGradeLabel,
      target_score: fields.targetScore,
    })
    .eq("id", subjectId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Subject update error:", updateError);
    return { error: `科目の更新に失敗しました（${updateError.message}）` };
  }

  // 評価項目は全削除→再挿入で同期する
  const { error: deleteError } = await supabase
    .from("grade_items")
    .delete()
    .eq("subject_id", subjectId);

  if (deleteError) {
    console.error("Grade items delete error:", deleteError);
    return { error: `評価項目の更新に失敗しました（${deleteError.message}）` };
  }

  const gradeItems = parseGradeItemsFromFormData(formData, subjectId);

  if (gradeItems.length > 0) {
    const { error: insertError } = await supabase
      .from("grade_items")
      .insert(gradeItems);

    if (insertError) {
      console.error("Grade items insert error:", insertError);
      return { error: `評価項目の保存に失敗しました（${insertError.message}）` };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/subjects");
  revalidatePath(`/subjects/${subjectId}`);
  redirect(`/subjects/${subjectId}`);
}

// ─────────────────────────────────────────
// 科目削除
// ─────────────────────────────────────────

export async function deleteSubject(subjectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証されていません");
  }

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Subject deletion error:", error);
    throw new Error("科目の削除に失敗しました");
  }

  revalidatePath("/dashboard");
  revalidatePath("/subjects");
}
