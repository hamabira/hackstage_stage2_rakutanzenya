"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GradeItemCategory } from "@/lib/types/domain";

export interface CreateSubjectState {
  error: string | null;
}

export async function createSubject(
  prevState: CreateSubjectState,
  formData: FormData
): Promise<CreateSubjectState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証されていません" };
  }

  // Parse subject fields
  const name = formData.get("name") as string;
  if (!name) {
    return { error: "科目名は必須です" };
  }

  const totalClassCount = formData.get("totalClassCount")
    ? parseInt(formData.get("totalClassCount") as string, 10)
    : null;
  const attendanceRequiredRate = formData.get("attendanceRequiredRate")
    ? parseFloat(formData.get("attendanceRequiredRate") as string)
    : null;
  const attendanceMaxAbsences = formData.get("attendanceMaxAbsences")
    ? parseInt(formData.get("attendanceMaxAbsences") as string, 10)
    : null;
  const attendanceAffectsGrade = formData.get("attendanceAffectsGrade") === "on";
  
  const targetGradeLabel = formData.get("targetGradeLabel") as string || null;
  const targetScore = formData.get("targetScore")
    ? parseFloat(formData.get("targetScore") as string)
    : null;

  // 1. Insert Subject
  const { data: subjectData, error: subjectError } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      name,
      total_class_count: totalClassCount,
      attendance_required_rate: attendanceRequiredRate,
      attendance_max_absences: attendanceMaxAbsences,
      attendance_affects_grade: attendanceAffectsGrade,
      target_grade_label: targetGradeLabel,
      target_score: targetScore,
    })
    .select("id")
    .single();

  if (subjectError) {
    console.error("Subject creation error:", subjectError);
    return { error: "科目の保存に失敗しました" };
  }

  const subjectId = subjectData.id;

  // 2. Parse and Insert Grade Items
  // FormData might have multiple fields for grade items like:
  // gradeItem_name_0, gradeItem_category_0, gradeItem_weight_0, gradeItem_maxScore_0
  const gradeItemsToInsert = [];
  
  // A simple way to iterate is to look for keys
  let index = 0;
  while (formData.has(`gradeItem_name_${index}`)) {
    const itemName = formData.get(`gradeItem_name_${index}`) as string;
    const category = formData.get(`gradeItem_category_${index}`) as GradeItemCategory;
    const weightStr = formData.get(`gradeItem_weight_${index}`) as string;
    const maxScoreStr = formData.get(`gradeItem_maxScore_${index}`) as string;

    if (itemName && category && weightStr) {
      gradeItemsToInsert.push({
        subject_id: subjectId,
        name: itemName,
        category: category,
        weight: parseFloat(weightStr) || 0,
        max_score: maxScoreStr ? parseFloat(maxScoreStr) : null,
        sort_order: index,
      });
    }
    index++;
  }

  if (gradeItemsToInsert.length > 0) {
    const { error: gradeItemsError } = await supabase
      .from("grade_items")
      .insert(gradeItemsToInsert);

    if (gradeItemsError) {
      console.error("Grade items creation error:", gradeItemsError);
      return { error: "評価項目の保存に失敗しました" };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/subjects");
  redirect("/dashboard");
}

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
    .eq("user_id", user.id); // セキュリティのため、自分の科目のみ削除可能に

  if (error) {
    console.error("Subject deletion error:", error);
    throw new Error("科目の削除に失敗しました");
  }

  revalidatePath("/dashboard");
  revalidatePath("/subjects");
}
