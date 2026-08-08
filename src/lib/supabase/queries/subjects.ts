import type { CreateSubjectInput } from "@/lib/subjects/subjectInput";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types/domain";

/** 保存に失敗した理由。利用者向けメッセージへの変換は呼び出し側が行う。 */
export type CreateSubjectError =
  | "unauthenticated"
  | "constraint_violation"
  | "unknown";

export type CreateSubjectResult =
  | { ok: true; subjectId: string }
  | { ok: false; error: CreateSubjectError };

/** DB制約違反を表すPostgresのエラーコード(CHECK/一意/NOT NULL)。 */
const CONSTRAINT_ERROR_CODES = new Set(["23514", "23505", "23502"]);

function toCreateSubjectError(code: string | undefined): CreateSubjectError {
  return code !== undefined && CONSTRAINT_ERROR_CODES.has(code)
    ? "constraint_violation"
    : "unknown";
}

export async function getSubjects(): Promise<Subject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select(
      "id, user_id, name, total_class_count, attendance_required_rate, attendance_max_absences, attendance_affects_grade, target_grade_label, target_score",
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch subjects", { cause: error });
  }

  if (!data) {
    throw new Error("Subjects query returned no data");
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    totalClassCount: row.total_class_count,
    attendanceRequiredRate: row.attendance_required_rate,
    attendanceMaxAbsences: row.attendance_max_absences,
    attendanceAffectsGrade: row.attendance_affects_grade,
    targetGradeLabel: row.target_grade_label,
    targetScore: row.target_score,
  }));
}

/**
 * 科目と評価項目を保存する。
 * user_id は呼び出し元の入力ではなく、認証済みセッションから取得した値だけを使う。
 * 評価項目の保存に失敗した場合は、作成済みの科目を削除して中途半端な状態を残さない。
 */
export async function createSubject(
  input: CreateSubjectInput,
): Promise<CreateSubjectResult> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { ok: false, error: "unauthenticated" };
  }

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .insert({
      user_id: userData.user.id,
      name: input.name,
      total_class_count: input.totalClassCount,
      attendance_required_rate: input.attendanceRequiredRate,
      attendance_max_absences: input.attendanceMaxAbsences,
      attendance_affects_grade: input.attendanceAffectsGrade,
      target_grade_label: input.targetGradeLabel,
      target_score: input.targetScore,
    })
    .select("id")
    .single();

  if (subjectError || !subject) {
    return { ok: false, error: toCreateSubjectError(subjectError?.code) };
  }

  if (input.gradeItems.length === 0) {
    return { ok: true, subjectId: subject.id };
  }

  const { error: gradeItemsError } = await supabase.from("grade_items").insert(
    input.gradeItems.map((item) => ({
      subject_id: subject.id,
      name: item.name,
      category: item.category,
      weight: item.weight,
      max_score: item.maxScore,
      sort_order: item.sortOrder,
    })),
  );

  if (gradeItemsError) {
    // 評価項目のない科目が残ると、成績計算ができない不整合な状態になる。
    // TODO: #9 でDB関数による単一トランザクション化に置き換える。
    await supabase.from("subjects").delete().eq("id", subject.id);
    return { ok: false, error: toCreateSubjectError(gradeItemsError.code) };
  }

  return { ok: true, subjectId: subject.id };
}
