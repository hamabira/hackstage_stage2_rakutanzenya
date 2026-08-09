import { describe, expect, it } from "vitest";
import type {
  AttendanceRecord,
  GradeItem,
  Subject,
  TestRecord,
} from "@/lib/types/domain";
import {
  buildSubjectSummaries,
  sortSubjectSummariesByRisk,
} from "./subjectSummary";

function buildSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "subject-1",
    userId: "user-1",
    name: "線形代数",
    totalClassCount: 10,
    attendanceRequiredRate: null,
    attendanceMaxAbsences: 3,
    attendanceAffectsGrade: false,
    targetGradeLabel: null,
    targetScore: null,
    ...overrides,
  };
}

function buildGradeItem(overrides: Partial<GradeItem> = {}): GradeItem {
  return {
    id: "item-1",
    subjectId: "subject-1",
    name: "期末テスト",
    category: "test",
    weight: 100,
    maxScore: 100,
    sortOrder: 0,
    ...overrides,
  };
}

function buildAbsence(subjectId: string, day: number): AttendanceRecord {
  return {
    id: `${subjectId}-${day}`,
    subjectId,
    classDate: `2026-04-${String(day).padStart(2, "0")}`,
    status: "absent",
    memo: null,
  };
}

describe("buildSubjectSummaries", () => {
  it("科目ごとに出席記録を振り分けて計算する", () => {
    const summaries = buildSubjectSummaries(
      [
        buildSubject({ id: "subject-1" }),
        buildSubject({ id: "subject-2", name: "統計学" }),
      ],
      [],
      [buildAbsence("subject-1", 1), buildAbsence("subject-1", 2)],
      [],
    );

    expect(summaries[0].attendance.remainingAllowedAbsences).toBe(1);
    expect(summaries[1].attendance.remainingAllowedAbsences).toBe(3);
  });

  it("他科目の評価項目を混ぜない", () => {
    const summaries = buildSubjectSummaries(
      [buildSubject({ id: "subject-1", targetScore: 80 })],
      [buildGradeItem({ id: "item-2", subjectId: "subject-2" })],
      [],
      [],
    );

    // 自科目の評価項目が無いため、目標計算は評価項目不足で計算不能になる。
    expect(summaries[0].gradeGoal.calculationError).toBe("missing_grade_items");
  });

  it("得点記録を評価項目経由で反映する", () => {
    const testRecord: TestRecord = {
      id: "record-1",
      gradeItemId: "item-1",
      score: 90,
      recordedAt: "2026-04-10",
      memo: null,
    };

    const summaries = buildSubjectSummaries(
      [buildSubject({ targetScore: 80 })],
      [buildGradeItem()],
      [],
      [testRecord],
    );

    expect(summaries[0].gradeGoal.status).toBe("achieved");
  });

  it("欠席上限を超過した科目は、点数目標が達成済みでも達成不可能にする", () => {
    const testRecord: TestRecord = {
      id: "record-1",
      gradeItemId: "item-1",
      score: 90,
      recordedAt: "2026-04-10",
      memo: null,
    };

    const summaries = buildSubjectSummaries(
      [buildSubject({ targetScore: 80, attendanceMaxAbsences: 3 })],
      [buildGradeItem()],
      [
        buildAbsence("subject-1", 1),
        buildAbsence("subject-1", 2),
        buildAbsence("subject-1", 3),
        buildAbsence("subject-1", 4),
      ],
      [testRecord],
    );

    expect(summaries[0].gradeGoal).toMatchObject({
      status: "unachievable",
      unachievableReason: "attendance_exceeded",
    });
  });

  it("計算不能な科目があっても他の科目の計算は成立する", () => {
    const summaries = buildSubjectSummaries(
      [
        // 出席条件が無いため計算不能になる科目
        buildSubject({ id: "subject-1", attendanceMaxAbsences: null }),
        buildSubject({ id: "subject-2" }),
      ],
      [],
      [],
      [],
    );

    expect(summaries[0].attendance.riskLevel).toBe("unavailable");
    expect(summaries[1].attendance.remainingAllowedAbsences).toBe(3);
  });

  it("総授業回数が未設定でも例外にならず計算不能として扱う", () => {
    const summaries = buildSubjectSummaries(
      [buildSubject({ totalClassCount: null })],
      [],
      [],
      [],
    );

    expect(summaries[0].attendance.calculationError).toBe("invalid_total_class_count");
  });
});

describe("sortSubjectSummariesByRisk", () => {
  it("危険度の高い科目を先頭に並べる", () => {
    const summaries = buildSubjectSummaries(
      [
        buildSubject({ id: "safe", name: "余裕" }),
        buildSubject({ id: "exceeded", name: "超過" }),
        buildSubject({ id: "danger", name: "危険" }),
        buildSubject({ id: "caution", name: "注意" }),
      ],
      [],
      [
        buildAbsence("exceeded", 1),
        buildAbsence("exceeded", 2),
        buildAbsence("exceeded", 3),
        buildAbsence("exceeded", 4),
        buildAbsence("danger", 1),
        buildAbsence("danger", 2),
        buildAbsence("danger", 3),
        buildAbsence("caution", 1),
        buildAbsence("caution", 2),
      ],
      [],
    );

    expect(sortSubjectSummariesByRisk(summaries).map((item) => item.subject.name)).toEqual([
      "超過",
      "危険",
      "注意",
      "余裕",
    ]);
  });

  it("計算不能な科目は最後に置く", () => {
    const summaries = buildSubjectSummaries(
      [
        buildSubject({ id: "unavailable", name: "未設定", attendanceMaxAbsences: null }),
        buildSubject({ id: "safe", name: "余裕" }),
      ],
      [],
      [],
      [],
    );

    expect(sortSubjectSummariesByRisk(summaries).map((item) => item.subject.name)).toEqual([
      "余裕",
      "未設定",
    ]);
  });

  it("元の配列を変更しない", () => {
    const summaries = buildSubjectSummaries(
      [buildSubject({ id: "a", name: "A" }), buildSubject({ id: "b", name: "B" })],
      [],
      [buildAbsence("a", 1), buildAbsence("a", 2), buildAbsence("a", 3)],
      [],
    );
    const originalOrder = summaries.map((item) => item.subject.name);

    sortSubjectSummariesByRisk(summaries);

    expect(summaries.map((item) => item.subject.name)).toEqual(originalOrder);
  });
});
