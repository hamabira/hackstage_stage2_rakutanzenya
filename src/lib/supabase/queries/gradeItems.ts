import { createClient } from "@/lib/supabase/server";
import type { GradeItem } from "@/lib/types/domain";

/**
 * 指定した科目の評価項目一覧を取得する
 */
export async function getGradeItemsBySubjectId(
  subjectId: string,
): Promise<GradeItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grade_items")
    .select("id, subject_id, name, category, weight, max_score, sort_order")
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch grade items", { cause: error });
  }

  if (!data) {
    throw new Error("Grade items query returned no data");
  }

  return data.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    category: row.category,
    weight: row.weight,
    maxScore: row.max_score,
    sortOrder: row.sort_order,
  }));
}

/**
 * ユーザーの全科目の評価項目を subjectId ごとにまとめて取得する
 */
export async function getGradeItemsGroupedBySubject(
  subjectIds: string[],
): Promise<Record<string, GradeItem[]>> {
  if (subjectIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grade_items")
    .select("id, subject_id, name, category, weight, max_score, sort_order")
    .in("subject_id", subjectIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch grade items", { cause: error });
  }

  const grouped: Record<string, GradeItem[]> = {};
  for (const row of data ?? []) {
    const item: GradeItem = {
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      category: row.category,
      weight: row.weight,
      maxScore: row.max_score,
      sortOrder: row.sort_order,
    };
    (grouped[row.subject_id] ??= []).push(item);
  }
  return grouped;
}
