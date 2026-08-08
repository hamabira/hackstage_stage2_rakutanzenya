import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types/domain";

/** 出席記録の読み書きに失敗した理由。利用者向け文言への変換は呼び出し側が行う。 */
export type AttendanceQueryError =
  | "unauthenticated"
  | "not_found"
  | "constraint_violation"
  | "unknown";

export type AttendanceRecordsResult =
  | { ok: true; records: AttendanceRecord[] }
  | { ok: false; error: AttendanceQueryError };

export type SaveAttendanceRecordResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; error: AttendanceQueryError };

export type DeleteAttendanceRecordResult =
  | { ok: true }
  | { ok: false; error: AttendanceQueryError };

export interface SaveAttendanceRecordInput {
  subjectId: string;
  /** YYYY-MM-DD 形式の授業日。 */
  classDate: string;
  status: AttendanceStatus;
  memo: string | null;
}

interface AttendanceRecordRow {
  id: string;
  subject_id: string;
  class_date: string;
  status: AttendanceStatus;
  memo: string | null;
}

const SELECT_COLUMNS = "id, subject_id, class_date, status, memo";

/** DB制約違反を表すPostgresのエラーコード(CHECK/一意/NOT NULL/外部キー)。 */
const CONSTRAINT_ERROR_CODES = new Set(["23514", "23505", "23502", "23503"]);

function toAttendanceQueryError(code: string | undefined): AttendanceQueryError {
  return code !== undefined && CONSTRAINT_ERROR_CODES.has(code)
    ? "constraint_violation"
    : "unknown";
}

function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    subjectId: row.subject_id,
    classDate: row.class_date,
    status: row.status,
    memo: row.memo,
  };
}

/**
 * 認証済みユーザーとSupabaseクライアントを取得する。
 * RLSに加えて呼び出し側でも認証を確認し、未ログイン時にクエリを投げない。
 */
async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return { supabase, userId: data.user.id };
}

/**
 * 科目の出席記録を授業日の昇順で取得する。
 * RLSにより他ユーザーの記録は返らない。
 */
export async function getAttendanceRecords(
  subjectId: string,
): Promise<AttendanceRecordsResult> {
  const client = await getAuthenticatedClient();
  if (!client) {
    return { ok: false, error: "unauthenticated" };
  }

  const { data, error } = await client.supabase
    .from("attendance_records")
    .select(SELECT_COLUMNS)
    .eq("subject_id", subjectId)
    .order("class_date", { ascending: true });

  if (error) {
    return { ok: false, error: toAttendanceQueryError(error.code) };
  }

  return { ok: true, records: (data ?? []).map(toAttendanceRecord) };
}

/**
 * 出席記録を保存する。同一科目・同一授業日の記録は上書きする。
 * 一意制約 attendance_records_subject_id_class_date_key を競合キーに使うため、
 * 「同じ日をもう一度記録し直す」操作でも記録が重複しない。
 * user_id は認証済みセッションの値のみを使い、呼び出し側の入力は受け取らない。
 */
export async function saveAttendanceRecord(
  input: SaveAttendanceRecordInput,
): Promise<SaveAttendanceRecordResult> {
  const client = await getAuthenticatedClient();
  if (!client) {
    return { ok: false, error: "unauthenticated" };
  }

  const { data, error } = await client.supabase
    .from("attendance_records")
    .upsert(
      {
        subject_id: input.subjectId,
        user_id: client.userId,
        class_date: input.classDate,
        status: input.status,
        memo: input.memo,
      },
      { onConflict: "subject_id,class_date" },
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, error: toAttendanceQueryError(error?.code) };
  }

  return { ok: true, record: toAttendanceRecord(data) };
}

/**
 * 出席記録を削除する。
 * RLSに加えて user_id でも絞り込み、他ユーザーの記録を消せないようにする。
 * 削除対象が存在しない場合は not_found を返す。
 */
export async function deleteAttendanceRecord(
  recordId: string,
): Promise<DeleteAttendanceRecordResult> {
  const client = await getAuthenticatedClient();
  if (!client) {
    return { ok: false, error: "unauthenticated" };
  }

  const { data, error } = await client.supabase
    .from("attendance_records")
    .delete()
    .eq("id", recordId)
    .eq("user_id", client.userId)
    .select("id");

  if (error) {
    return { ok: false, error: toAttendanceQueryError(error.code) };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true };
}
