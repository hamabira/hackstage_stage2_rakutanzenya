import { createClient } from "@/lib/supabase/server";
import type { TestRecord } from "@/lib/types/domain";

function mapRow(row: {
  id: string;
  grade_item_id: string;
  score: number;
  recorded_at: string;
  memo: string | null;
}): TestRecord {
  return {
    id: row.id,
    gradeItemId: row.grade_item_id,
    score: row.score,
    recordedAt: row.recorded_at,
    memo: row.memo,
  };
}

/**
 * 複数の grade_item_id に紐づく test_records を一括取得し、
 * grade_item_id をキーとした Record で返す（最新1件を採用）。
 * ダッシュボード・科目一覧の計算に使用する。
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
      latestByItem[row.grade_item_id] = mapRow(row);
    }
  }

  return latestByItem;
}

/**
 * 指定した science_item_ids の全実績を grade_item_id ごとにまとめて取得する。
 * テスト・課題記録ページで全履歴を表示するのに使用する。
 */
export async function getAllTestRecordsByGradeItemIds(
  gradeItemIds: string[],
): Promise<Record<string, TestRecord[]>> {
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

  const grouped: Record<string, TestRecord[]> = {};
  for (const row of data ?? []) {
    (grouped[row.grade_item_id] ??= []).push(mapRow(row));
  }
  return grouped;
}
