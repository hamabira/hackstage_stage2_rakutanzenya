import { createClient } from "@/lib/supabase/server";
import type { GradeItem } from "@/lib/types/domain";

function mapRow(row: {
  id: string;
  subject_id: string;
  name: string;
  category: string;
  weight: number;
  max_score: number | null;
  sort_order: number;
}): GradeItem {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    category: row.category as GradeItem["category"],
    weight: row.weight,
    maxScore: row.max_score,
    sortOrder: row.sort_order,
  };
}

const SELECT_FIELDS =
  "id, subject_id, name, category, weight, max_score, sort_order";

/**
 * 指定した科目の評価項目一覧を取得する
 */
export async function getGradeItemsBySubjectId(
  subjectId: string,
): Promise<GradeItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grade_items")
    .select(SELECT_FIELDS)
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch grade items", { cause: error });
  }

  return (data ?? []).map(mapRow);
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
    .select(SELECT_FIELDS)
    .in("subject_id", subjectIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch grade items", { cause: error });
  }

  const grouped: Record<string, GradeItem[]> = {};
  for (const row of data ?? []) {
    (grouped[row.subject_id] ??= []).push(mapRow(row));
  }
  return grouped;
}
