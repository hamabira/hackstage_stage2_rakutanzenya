import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceRecord,
  GradeItem,
  GradeItemCategory,
  TestRecord,
} from "@/lib/types/domain";

/**
 * ダッシュボードに必要な記録をまとめて取得した結果。
 * 一部の取得に失敗しても他は表示できるよう、失敗したものだけを failedLabels で示す。
 */
export interface DashboardRecords {
  gradeItems: GradeItem[];
  attendanceRecords: AttendanceRecord[];
  testRecords: TestRecord[];
  failedLabels: string[];
}

type GradeItemRow = {
  id: string;
  subject_id: string;
  name: string;
  category: GradeItemCategory;
  weight: number | string;
  max_score: number | string | null;
  sort_order: number | string;
};

type AttendanceRow = {
  id: string;
  subject_id: string;
  class_date: string;
  status: AttendanceRecord["status"];
  memo: string | null;
};

type TestRecordRow = {
  id: string;
  grade_item_id: string;
  score: number | string;
  recorded_at: string;
  memo: string | null;
};

/** Supabaseのnumeric列は文字列で返るため、number へ揃える。 */
function toNullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

const EMPTY_RECORDS: Omit<DashboardRecords, "failedLabels"> = {
  gradeItems: [],
  attendanceRecords: [],
  testRecords: [],
};

/**
 * 全科目分の評価項目・出席記録・得点記録を、科目数に依存しない回数で取得する。
 * 科目ごとに問い合わせるとN+1になるため、subject_id をまとめて指定する。
 */
export async function getDashboardRecords(
  subjectIds: string[],
): Promise<DashboardRecords> {
  if (subjectIds.length === 0) {
    return { ...EMPTY_RECORDS, failedLabels: [] };
  }

  const supabase = await createClient();
  const failedLabels: string[] = [];

  const [gradeItemsResponse, attendanceResponse] = await Promise.all([
    supabase
      .from("grade_items")
      .select("id, subject_id, name, category, weight, max_score, sort_order")
      .in("subject_id", subjectIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("attendance_records")
      .select("id, subject_id, class_date, status, memo")
      .in("subject_id", subjectIds)
      .order("class_date", { ascending: true }),
  ]);

  if (gradeItemsResponse.error) {
    failedLabels.push("評価項目");
  }

  if (attendanceResponse.error) {
    failedLabels.push("出席記録");
  }

  const gradeItems: GradeItem[] = (gradeItemsResponse.data ?? []).map((row) => {
    const gradeItemRow = row as GradeItemRow;
    return {
      id: gradeItemRow.id,
      subjectId: gradeItemRow.subject_id,
      name: gradeItemRow.name,
      category: gradeItemRow.category,
      weight: Number(gradeItemRow.weight),
      maxScore: toNullableNumber(gradeItemRow.max_score),
      sortOrder: Number(gradeItemRow.sort_order),
    };
  });

  const attendanceRecords: AttendanceRecord[] = (attendanceResponse.data ?? []).map(
    (row) => {
      const attendanceRow = row as AttendanceRow;
      return {
        id: attendanceRow.id,
        subjectId: attendanceRow.subject_id,
        classDate: attendanceRow.class_date,
        status: attendanceRow.status,
        memo: attendanceRow.memo,
      };
    },
  );

  // 得点記録は評価項目経由でしか科目に紐づかないため、評価項目の取得後に問い合わせる。
  const gradeItemIds = gradeItems.map((gradeItem) => gradeItem.id);

  if (gradeItemIds.length === 0) {
    return { gradeItems, attendanceRecords, testRecords: [], failedLabels };
  }

  const { data: testRecordRows, error: testRecordsError } = await supabase
    .from("test_records")
    .select("id, grade_item_id, score, recorded_at, memo")
    .in("grade_item_id", gradeItemIds)
    .order("recorded_at", { ascending: true });

  if (testRecordsError) {
    failedLabels.push("得点記録");
  }

  const testRecords: TestRecord[] = (testRecordRows ?? []).map((row) => {
    const testRecordRow = row as TestRecordRow;
    return {
      id: testRecordRow.id,
      gradeItemId: testRecordRow.grade_item_id,
      score: Number(testRecordRow.score),
      recordedAt: testRecordRow.recorded_at,
      memo: testRecordRow.memo,
    };
  });

  return { gradeItems, attendanceRecords, testRecords, failedLabels };
}
