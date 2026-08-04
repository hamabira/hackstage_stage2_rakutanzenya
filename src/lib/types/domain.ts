export type GradeItemCategory = "attendance" | "assignment" | "test" | "other";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface Subject {
  id: string;
  userId: string;
  name: string;
  totalClassCount: number | null;
  attendanceRequiredRate: number | null;
  attendanceMaxAbsences: number | null;
  attendanceAffectsGrade: boolean;
  targetGradeLabel: string | null;
  targetScore: number | null;
}

export interface GradeItem {
  id: string;
  subjectId: string;
  name: string;
  category: GradeItemCategory;
  weight: number;
  maxScore: number | null;
  sortOrder: number;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  classDate: string;
  status: AttendanceStatus;
  memo: string | null;
}

export interface TestRecord {
  id: string;
  gradeItemId: string;
  score: number;
  recordedAt: string;
  memo: string | null;
}
