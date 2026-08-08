import type {
  CreateSubjectInput,
  UpdateSubjectInput,
} from "@/lib/subjects/subjectInput";
import { createClient } from "@/lib/supabase/server";
import type { GradeItem, GradeItemCategory, Subject } from "@/lib/types/domain";

type SubjectRow = {
  id: string;
  user_id: string;
  name: string;
  total_class_count: number | string | null;
  attendance_required_rate: number | string | null;
  attendance_max_absences: number | string | null;
  attendance_affects_grade: boolean;
  target_grade_label: string | null;
  target_score: number | string | null;
};

type GradeItemRow = {
  id: string;
  subject_id: string;
  name: string;
  category: GradeItemCategory;
  weight: number | string;
  max_score: number | string | null;
  sort_order: number | string;
};

type SubjectWithGradeItems = {
  subject: Subject;
  gradeItems: GradeItem[];
};

type GetSubjectError = "unauthenticated" | "not_found" | "forbidden" | "unknown";

export type SubjectQueryError =
  | "unauthenticated"
  | "not_found"
  | "forbidden"
  | "constraint_violation"
  | "unknown";

/** #15が利用中の新規保存用エラー種別。 */
export type CreateSubjectError =
  | "unauthenticated"
  | "constraint_violation"
  | "unknown";

export type CreateSubjectResult =
  | { ok: true; subjectId: string }
  | { ok: false; error: CreateSubjectError };

export type GetSubjectResult =
  | ({ ok: true } & SubjectWithGradeItems)
  | { ok: false; error: GetSubjectError };

export type UpdateSubjectResult =
  | ({ ok: true; subjectId: string } & SubjectWithGradeItems)
  | { ok: false; error: SubjectQueryError };

export type DeleteSubjectResult =
  | { ok: true }
  | { ok: false; error: SubjectQueryError };

const SUBJECT_COLUMNS =
  "id, user_id, name, total_class_count, attendance_required_rate, attendance_max_absences, attendance_affects_grade, target_grade_label, target_score";
const GRADE_ITEM_COLUMNS = "id, subject_id, name, category, weight, max_score, sort_order";
const CONSTRAINT_ERROR_CODES = new Set(["23514", "23505", "23502"]);

/** Supabaseのnumeric列をアプリで扱うnumberへ変換する。 */
function toNullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

/** subjectsテーブルの行をドメイン型へ変換する。 */
function toSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    totalClassCount: toNullableNumber(row.total_class_count),
    attendanceRequiredRate: toNullableNumber(row.attendance_required_rate),
    attendanceMaxAbsences: toNullableNumber(row.attendance_max_absences),
    attendanceAffectsGrade: row.attendance_affects_grade,
    targetGradeLabel: row.target_grade_label,
    targetScore: toNullableNumber(row.target_score),
  };
}

/** grade_itemsテーブルの行をドメイン型へ変換する。 */
function toGradeItem(row: GradeItemRow): GradeItem {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    category: row.category,
    weight: Number(row.weight),
    maxScore: toNullableNumber(row.max_score),
    sortOrder: Number(row.sort_order),
  };
}

/** DBエラーコードを呼び出し側が扱えるエラー種別へ変換する。 */
function toSubjectQueryError(code: string | undefined): SubjectQueryError {
  if (code === "P0002") {
    return "not_found";
  }

  if (code === "42501") {
    return "forbidden";
  }

  if (code !== undefined && CONSTRAINT_ERROR_CODES.has(code)) {
    return "constraint_violation";
  }

  return "unknown";
}

/** #15の既存エラー契約に収める。 */
function toCreateSubjectError(code: string | undefined): CreateSubjectError {
  const error = toSubjectQueryError(code);
  return error === "unauthenticated" || error === "constraint_violation" ? error : "unknown";
}

/** フォーム用のcamelCase入力をRPC用snake_caseへ変換する。 */
function toSubjectPayload(input: CreateSubjectInput | UpdateSubjectInput) {
  return {
    name: input.name,
    total_class_count: input.totalClassCount,
    attendance_required_rate: input.attendanceRequiredRate,
    attendance_max_absences: input.attendanceMaxAbsences,
    attendance_affects_grade: input.attendanceAffectsGrade,
    target_grade_label: input.targetGradeLabel,
    target_score: input.targetScore,
  };
}

/** 評価項目入力をRPC用snake_caseへ変換する。 */
function toGradeItemsPayload(input: CreateSubjectInput | UpdateSubjectInput) {
  return input.gradeItems.map((item) => ({
    ...("id" in item && item.id !== undefined ? { id: item.id } : {}),
    name: item.name,
    category: item.category,
    weight: item.weight,
    max_score: item.maxScore,
    sort_order: item.sortOrder,
  }));
}

/** 認証済みセッションを確認し、未認証ならエラーを返す。 */
async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false as const, error: "unauthenticated" as const };
  }

  return { ok: true as const, supabase, userId: data.user.id };
}

/** 同じSupabaseクライアントで、本人の科目と評価項目を取得する。 */
async function getSubjectWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectId: string,
): Promise<GetSubjectResult> {
  const { data: subjectRow, error: subjectError } = await supabase
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .eq("id", subjectId)
    .maybeSingle();

  if (subjectError) {
    return { ok: false, error: toSubjectQueryError(subjectError.code) as GetSubjectError };
  }

  if (!subjectRow) {
    return { ok: false, error: "not_found" };
  }

  const { data: gradeItemRows, error: gradeItemsError } = await supabase
    .from("grade_items")
    .select(GRADE_ITEM_COLUMNS)
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  if (gradeItemsError) {
    return { ok: false, error: toSubjectQueryError(gradeItemsError.code) as GetSubjectError };
  }

  return {
    ok: true,
    subject: toSubject(subjectRow as SubjectRow),
    gradeItems: (gradeItemRows ?? []).map((row) => toGradeItem(row as GradeItemRow)),
  };
}

/** ログイン中ユーザーが所有する科目一覧を取得する。 */
export async function getSubjects(): Promise<Subject[]> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    throw new Error("Unauthenticated");
  }

  const { data, error } = await authenticated.supabase
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch subjects", { cause: error });
  }

  return (data ?? []).map((row) => toSubject(row as SubjectRow));
}

/** 指定IDの科目と評価項目を取得する。RLSにより他ユーザーの科目は返さない。 */
export async function getSubject(subjectId: string): Promise<GetSubjectResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  return getSubjectWithClient(authenticated.supabase, subjectId);
}

/** 科目と評価項目をDB関数で一括作成する。 */
export async function createSubject(input: CreateSubjectInput): Promise<CreateSubjectResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return { ok: false, error: "unauthenticated" };
  }

  const { data: subjectId, error } = await authenticated.supabase.rpc(
    "create_subject_with_grade_items",
    {
      p_subject: toSubjectPayload(input),
      p_grade_items: toGradeItemsPayload(input),
    },
  );

  if (error || typeof subjectId !== "string") {
    return { ok: false, error: toCreateSubjectError(error?.code) };
  }

  return { ok: true, subjectId };
}

/** 科目と評価項目をDB関数で一括更新・同期する。 */
export async function updateSubject(
  subjectId: string,
  input: UpdateSubjectInput,
): Promise<UpdateSubjectResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const { data: updatedSubjectId, error } = await authenticated.supabase.rpc(
    "update_subject_with_grade_items",
    {
      p_subject_id: subjectId,
      p_subject: toSubjectPayload(input),
      p_grade_items: toGradeItemsPayload(input),
    },
  );

  if (error || typeof updatedSubjectId !== "string") {
    return { ok: false, error: toSubjectQueryError(error?.code) };
  }

  const subjectResult = await getSubjectWithClient(authenticated.supabase, updatedSubjectId);
  if (!subjectResult.ok) {
    return subjectResult;
  }

  return {
    ok: true,
    subjectId: updatedSubjectId,
    subject: subjectResult.subject,
    gradeItems: subjectResult.gradeItems,
  };
}

/**
 * 自分が登録した科目を削除する。
 * 評価項目・出席記録・点数記録は、外部キーの on delete cascade により同時に削除される。
 */
export async function deleteSubject(subjectId: string): Promise<DeleteSubjectResult> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated.ok) {
    return authenticated;
  }

  const { data, error } = await authenticated.supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", authenticated.userId)
    .select("id");

  if (error) {
    return { ok: false, error: toSubjectQueryError(error.code) };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true };
}
