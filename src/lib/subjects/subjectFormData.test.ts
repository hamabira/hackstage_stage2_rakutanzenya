import { describe, expect, it } from "vitest";
import { parseSubjectFormData } from "./subjectFormData";

/** SubjectForm が送信するのと同じ形のFormDataを組み立てる。 */
function buildFormData(
  overrides: Record<string, string> = {},
  gradeItems: Array<Record<string, string>> = [
    { name: "期末テスト", category: "test", weight: "100", maxScore: "100" },
  ],
): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    name: "線形代数",
    totalClassCount: "15",
    attendanceRequiredRate: "80",
    attendanceMaxAbsences: "3",
    targetGradeLabel: "優",
    targetScore: "80",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  gradeItems.forEach((item, index) => {
    formData.set(`gradeItems[${index}][sortOrder]`, String(index));
    for (const [key, value] of Object.entries(item)) {
      formData.set(`gradeItems[${index}][${key}]`, value);
    }
  });

  return formData;
}

describe("parseSubjectFormData", () => {
  it("フォームの入力値を取り出す", () => {
    const result = parseSubjectFormData(buildFormData());

    expect(result.ok).toBe(true);
    expect(result.ok && result.values).toMatchObject({
      name: "線形代数",
      totalClassCount: "15",
      attendanceRequiredRate: "80",
      attendanceMaxAbsences: "3",
      targetGradeLabel: "優",
      targetScore: "80",
    });
  });

  it("チェックされていないcheckboxをfalseとして扱う", () => {
    const result = parseSubjectFormData(buildFormData());
    expect(result.ok && result.values.attendanceAffectsGrade).toBe(false);
  });

  it("チェックされたcheckboxをtrueとして扱う", () => {
    const formData = buildFormData();
    formData.set("attendanceAffectsGrade", "true");

    const result = parseSubjectFormData(formData);
    expect(result.ok && result.values.attendanceAffectsGrade).toBe(true);
  });

  it("評価項目を添字の昇順で配列にする", () => {
    const result = parseSubjectFormData(
      buildFormData({}, [
        { name: "中間", category: "test", weight: "40", maxScore: "100" },
        { name: "課題", category: "assignment", weight: "20", maxScore: "50" },
        { name: "期末", category: "test", weight: "40", maxScore: "100" },
      ]),
    );

    expect(result.ok && result.values.gradeItems.map((item) => item.name)).toEqual([
      "中間",
      "課題",
      "期末",
    ]);
  });

  it("添字が10以上でも文字列ではなく数値として並べ替える", () => {
    const gradeItems = Array.from({ length: 11 }, (_, index) => ({
      name: `項目${index}`,
      category: "test",
      weight: "10",
      maxScore: "100",
    }));

    const result = parseSubjectFormData(buildFormData({}, gradeItems));

    expect(result.ok && result.values.gradeItems.at(-1)?.name).toBe("項目10");
  });

  it("評価項目が1件もない場合は空配列を返す", () => {
    const result = parseSubjectFormData(buildFormData({}, []));
    expect(result.ok && result.values.gradeItems).toEqual([]);
  });

  it("未送信のフィールドを空文字として扱う", () => {
    const formData = buildFormData();
    formData.delete("targetScore");

    const result = parseSubjectFormData(formData);
    expect(result.ok && result.values.targetScore).toBe("");
  });

  it("選択肢にないカテゴリを拒否する", () => {
    const result = parseSubjectFormData(
      buildFormData({}, [
        { name: "不正", category: "bonus", weight: "100", maxScore: "100" },
      ]),
    );

    expect(result).toEqual({ ok: false, error: "invalid_grade_item_category" });
  });

  it("文字列でない値が送られた場合を拒否する", () => {
    const formData = buildFormData();
    formData.set("name", new File([], "attack.txt"));

    const result = parseSubjectFormData(formData);
    expect(result).toEqual({ ok: false, error: "invalid_field_type" });
  });
});
