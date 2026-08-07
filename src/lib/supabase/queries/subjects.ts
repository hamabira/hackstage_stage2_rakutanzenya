import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types/domain";

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

export async function getSubjectById(id: string): Promise<Subject | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select(
      "id, user_id, name, total_class_count, attendance_required_rate, attendance_max_absences, attendance_affects_grade, target_grade_label, target_score",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    totalClassCount: data.total_class_count,
    attendanceRequiredRate: data.attendance_required_rate,
    attendanceMaxAbsences: data.attendance_max_absences,
    attendanceAffectsGrade: data.attendance_affects_grade,
    targetGradeLabel: data.target_grade_label,
    targetScore: data.target_score,
  };
}
