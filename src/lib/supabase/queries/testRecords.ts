import { createClient } from "@/lib/supabase/server";
import type { TestRecord } from "@/lib/types/domain";

/**
 * 複数の grade_item_id に紐づく test_records を一括取得し、
 * grade_item_id をキーとした Map で返す（最新1件を採用）。
 */
export async function getLatestTestRecordsByGradeItemIds(
  gradeItemIds: string[],
): Promise<Record<string, TestRecord>> {
  if (gradeItemIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("test_records")
    .select("id, grade_item_id, score, recorded_at, memo")
    .in("grade_item_id", gradeItemIds)
    .order("recorded_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch test records", { cause: error });
  }

  // grade_item_id ごとに最新1件のみ保持
  const latestByItem: Record<string, TestRecord> = {};
  for (const row of data ?? []) {
    if (!latestByItem[row.grade_item_id]) {
      latestByItem[row.grade_item_id] = {
        id: row.id,
        gradeItemId: row.grade_item_id,
        score: row.score,
        recordedAt: row.recorded_at,
        memo: row.memo,
      };
    }
  }

  return latestByItem;
}
