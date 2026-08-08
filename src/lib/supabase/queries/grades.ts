import { createClient } from "@/lib/supabase/server";
import type { TestRecord } from "@/lib/types/domain";

type TestRecordRow = {
  id: string;
  grade_item_id: string;
  score: number | string;
  recorded_at: string;
  memo: string | null;
};

type GradeItemRow = {
  id: string;
  max_score: number | string | null;
};

type GradeItemIdRow = {
  id: string;
};

export type CreateTestRecordInput = {
  gradeItemId: string;
  score: number;
  recordedAt: string;
  memo: string | null;
};

export type UpdateTestRecordInput = Pick<CreateTestRecordInput, "score" | "recordedAt" | "memo">;

export type TestRecordQueryError =
  | "unauthenticated"
  | "not_found"
  | "forbidden"
  | "invalid_score"
  | "missing_max_score"
  | "unknown";

export type TestRecordsResult =
  | { ok: true; records: TestRecord[] }
  | { ok: false; error: TestRecordQueryError };

export type TestRecordResult =
  | { ok: true; record: TestRecord }
  | { ok: false; error: TestRecordQueryError };

export type DeleteTestRecordResult =
  | { ok: true }
  | { ok: false; error: TestRecordQueryError };

const TEST_RECORD_COLUMNS = "id, grade_item_id, score, recorded_at, memo";

/** test_recordsテーブルの行をアプリケーションで使うTestRecord型へ変換する。 */
function toTestRecord(row: TestRecordRow): TestRecord {
  return {
    id: row.id,
    gradeItemId: row.grade_item_id,
    score: Number(row.score),
    recordedAt: row.recorded_at,
    memo: row.memo,
  };
}

/** Supabaseエラーを、画面側で扱える得点記録用のエラー種別へ変換する。 */
function toTestRecordQueryError(code: string | undefined): TestRecordQueryError {
  if (code === "42501") {
    return "forbidden";
  }

  return "unknown";
}

/** ログイン済みのSupabaseクライアントと利用者IDを取得する。 */
async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false as const, error: "unauthenticated" as const };
  }

  return { ok: true as const, supabase, userId: data.user.id };
}

/** RLSで閲覧可能な評価項目を取得し、得点の上限確認に使う。 */
async function getGradeItemWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gradeItemId: string,
): Promise<{ ok: true; gradeItem: GradeItemRow } | { ok: false; error: TestRecordQueryError }> {
  const { data, error } = await supabase
    .from("grade_items")
    .select("id, max_score")
    .eq("id", gradeItemId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: toTestRecordQueryError(error.code) };
  }

  if (!data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, gradeItem: data as GradeItemRow };
}

/** RLSで閲覧可能な得点記録を取得する。 */
async function getTestRecordWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recordId: string,
): Promise<{ ok: true; record: TestRecordRow } | { ok: false; error: TestRecordQueryError }> {
  const { data, error } = await supabase
    .from("test_records")
    .select(TEST_RECORD_COLUMNS)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: toTestRecordQueryError(error.code) };
  }

  if (!data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, record: data as TestRecordRow };
}

/** 得点が0以上かつ評価項目に設定された満点以下かを確認する。 */
function validateScore(score: number, maxScore: number | string | null): TestRecordQueryError | null {
  if (!Number.isFinite(score) || score < 0) {
    return "invalid_score";
  }

  if (maxScore === null) {
    return "missing_max_score";
  }

  if (score > Number(maxScore)) {
    return "invalid_score";
  }

  return null;
}

/** 科目IDに紐づく得点記録を、記録日順で取得する。 */
export async function getTestRecordsBySubjectId(subjectId: string): Promise<TestRecordsResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const { data: subject, error: subjectError } = await authenticated.supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .maybeSingle();

  if (subjectError) {
    return { ok: false, error: toTestRecordQueryError(subjectError.code) };
  }

  if (!subject) {
    return { ok: false, error: "not_found" };
  }

  const { data: gradeItems, error: gradeItemsError } = await authenticated.supabase
    .from("grade_items")
    .select("id")
    .eq("subject_id", subjectId);

  if (gradeItemsError) {
    return { ok: false, error: toTestRecordQueryError(gradeItemsError.code) };
  }

  const gradeItemIds = (gradeItems ?? []).map((gradeItem) => (gradeItem as GradeItemIdRow).id);
  if (gradeItemIds.length === 0) {
    return { ok: true, records: [] };
  }

  const { data, error } = await authenticated.supabase
    .from("test_records")
    .select(TEST_RECORD_COLUMNS)
    .in("grade_item_id", gradeItemIds)
    .order("recorded_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return { ok: false, error: toTestRecordQueryError(error.code) };
  }

  return { ok: true, records: (data ?? []).map((row) => toTestRecord(row as TestRecordRow)) };
}

/** 評価項目IDに紐づく得点記録を、記録日順で取得する。 */
export async function getTestRecordsByGradeItemId(gradeItemId: string): Promise<TestRecordsResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const gradeItemResult = await getGradeItemWithClient(authenticated.supabase, gradeItemId);
  if (!gradeItemResult.ok) {
    return gradeItemResult;
  }

  const { data, error } = await authenticated.supabase
    .from("test_records")
    .select(TEST_RECORD_COLUMNS)
    .eq("grade_item_id", gradeItemId)
    .order("recorded_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return { ok: false, error: toTestRecordQueryError(error.code) };
  }

  return { ok: true, records: (data ?? []).map((row) => toTestRecord(row as TestRecordRow)) };
}

/** 評価項目の満点を確認してから、新しい得点記録を登録する。 */
export async function createTestRecord(input: CreateTestRecordInput): Promise<TestRecordResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const gradeItemResult = await getGradeItemWithClient(authenticated.supabase, input.gradeItemId);
  if (!gradeItemResult.ok) {
    return gradeItemResult;
  }

  const scoreError = validateScore(input.score, gradeItemResult.gradeItem.max_score);
  if (scoreError) {
    return { ok: false, error: scoreError };
  }

  const { data, error } = await authenticated.supabase
    .from("test_records")
    .insert({
      grade_item_id: input.gradeItemId,
      user_id: authenticated.userId,
      score: input.score,
      recorded_at: input.recordedAt,
      memo: input.memo,
    })
    .select(TEST_RECORD_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, error: toTestRecordQueryError(error?.code) };
  }

  return { ok: true, record: toTestRecord(data as TestRecordRow) };
}

/** 自分の既存得点記録の得点・記録日・メモを更新する。 */
export async function updateTestRecord(
  recordId: string,
  input: UpdateTestRecordInput,
): Promise<TestRecordResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const recordResult = await getTestRecordWithClient(authenticated.supabase, recordId);
  if (!recordResult.ok) {
    return recordResult;
  }

  const gradeItemResult = await getGradeItemWithClient(
    authenticated.supabase,
    recordResult.record.grade_item_id,
  );
  if (!gradeItemResult.ok) {
    return gradeItemResult;
  }

  const scoreError = validateScore(input.score, gradeItemResult.gradeItem.max_score);
  if (scoreError) {
    return { ok: false, error: scoreError };
  }

  const { data, error } = await authenticated.supabase
    .from("test_records")
    .update({
      score: input.score,
      recorded_at: input.recordedAt,
      memo: input.memo,
    })
    .eq("id", recordId)
    .select(TEST_RECORD_COLUMNS)
    .maybeSingle();

  if (error) {
    return { ok: false, error: toTestRecordQueryError(error.code) };
  }

  if (!data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, record: toTestRecord(data as TestRecordRow) };
}

/** 自分の得点記録を削除する。削除前の確認操作はUI側で行う。 */
export async function deleteTestRecord(recordId: string): Promise<DeleteTestRecordResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const { data, error } = await authenticated.supabase
    .from("test_records")
    .delete()
    .eq("id", recordId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: toTestRecordQueryError(error.code) };
  }

  if (!data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true };
}
