import { describe, expect, it } from "vitest";
import { normalizeExtraction } from "./normalizeExtraction";
import type { ExtractedField, ExtractedGradeItem, ExtractedSubjectDraft } from "./types";

const INPUT = [
  "線形代数",
  "全15回の授業を行う。",
  "出席率80%以上が必要。3回まで欠席可能。",
  "中間30%、期末70%で評価する。",
  "目標はB（80点以上）。",
].join("\n");

function field<T>(
  value: T | null,
  status: ExtractedField<T>["status"] = "explicit",
  evidence: string | null = "全15回",
): ExtractedField<T> {
  return { value, status, evidence };
}

function missing<T>(): ExtractedField<T> {
  return { value: null, status: "missing", evidence: null };
}

function gradeItem(overrides: Partial<ExtractedGradeItem> = {}): ExtractedGradeItem {
  return {
    name: field("中間", "explicit", "中間30%"),
    category: field("test", "explicit", "中間30%"),
    weight: field(30, "explicit", "中間30%"),
    maxScore: field(100, "derived", "中間30%"),
    ...overrides,
  };
}

/** 正常に通る抽出結果を作り、overridesで一部だけ差し替えられるようにする。 */
function buildRaw(overrides: Partial<ExtractedSubjectDraft> = {}): ExtractedSubjectDraft {
  return {
    subjectName: field("線形代数", "explicit", "線形代数"),
    totalClassCount: field(15, "explicit", "全15回"),
    attendanceRequiredRate: field(80, "explicit", "出席率80%以上"),
    attendanceMaxAbsences: field(3, "explicit", "3回まで欠席可能"),
    attendanceAffectsGrade: field(false, "missing", null),
    targetGradeLabel: field("B", "explicit", "目標はB"),
    targetScore: field(80, "explicit", "80点以上"),
    gradeItems: [
      gradeItem(),
      gradeItem({
        name: field("期末", "explicit", "期末70%"),
        category: field("test", "explicit", "期末70%"),
        weight: field(70, "explicit", "期末70%"),
      }),
    ],
    detectedSubjectCount: 1,
    ...overrides,
  };
}

/** okのときだけdraftを取り出す。 */
function normalizeOk(raw: ExtractedSubjectDraft, input = INPUT) {
  const result = normalizeExtraction(raw, input);
  if (!result.ok) {
    throw new Error(`正規化が失敗した: ${result.error}`);
  }
  return result.draft;
}

describe("normalizeExtraction", () => {
  describe("正常系", () => {
    it("短い自然言語から全項目をフォームの値へ変換する", () => {
      const draft = normalizeOk(buildRaw());

      expect(draft.values.name).toBe("線形代数");
      expect(draft.values.totalClassCount).toBe("15");
      expect(draft.values.attendanceRequiredRate).toBe("80");
      expect(draft.values.attendanceMaxAbsences).toBe("3");
      expect(draft.values.targetGradeLabel).toBe("B");
      expect(draft.values.targetScore).toBe("80");
      expect(draft.values.gradeItems).toHaveLength(2);
    });

    it("評価割合の合計が100%なら警告を出さない", () => {
      expect(normalizeOk(buildRaw()).warnings).toEqual([]);
    });

    it("評価項目のidを連番にし、persistedIdを付けない", () => {
      const draft = normalizeOk(buildRaw());

      expect(draft.values.gradeItems.map((item) => item.id)).toEqual([
        "grade-item-0",
        "grade-item-1",
      ]);
      for (const item of draft.values.gradeItems) {
        expect(item.persistedId).toBeUndefined();
      }
    });

    it("長いシラバスで大半が未記載でも、取れた項目だけを返す", () => {
      const draft = normalizeOk(
        buildRaw({
          subjectName: missing(),
          attendanceRequiredRate: missing(),
          attendanceMaxAbsences: missing(),
          targetGradeLabel: missing(),
          targetScore: missing(),
        }),
      );

      expect(draft.values.name).toBe("");
      expect(draft.values.attendanceRequiredRate).toBe("");
      expect(draft.values.totalClassCount).toBe("15");
      expect(draft.notes.name.status).toBe("missing");
    });

    it("満点が未記載なら100を仮設定し、その旨をメモへ残す", () => {
      const draft = normalizeOk(
        buildRaw({ gradeItems: [gradeItem({ maxScore: missing(), weight: field(100, "explicit", "中間30%") })] }),
      );

      expect(draft.values.gradeItems[0].maxScore).toBe("100");
      expect(draft.notes["gradeItems.0.maxScore"]).toEqual({
        status: "derived",
        evidence: null,
        note: "100点満点として仮設定しました。",
      });
    });

    it("出席カテゴリに配点があれば出席を成績に含める", () => {
      const draft = normalizeOk(
        buildRaw({
          gradeItems: [
            gradeItem({
              name: field("出席", "explicit", "出席率80%以上"),
              category: field("attendance", "explicit", "出席率80%以上"),
              weight: field(100, "explicit", "出席率80%以上"),
            }),
          ],
          attendanceAffectsGrade: missing(),
        }),
      );

      expect(draft.values.attendanceAffectsGrade).toBe(true);
      expect(draft.notes.attendanceAffectsGrade.note).toBe("出席の配点があるため有効にしました。");
    });

    it("出席率を小数第2位へ丸める", () => {
      const draft = normalizeOk(
        buildRaw({
          attendanceRequiredRate: field(66.666_666, "derived", "出席率80%以上"),
        }),
      );

      expect(draft.values.attendanceRequiredRate).toBe("66.67");
    });

    it("評価項目を読み取れなければ空行を1件用意する", () => {
      const draft = normalizeOk(buildRaw({ gradeItems: [] }));

      expect(draft.values.gradeItems).toEqual([
        { id: "grade-item-0", name: "", category: "test", weight: "", maxScore: "100" },
      ]);
      expect(draft.warnings).toContain("評価項目を読み取れませんでした。手動で追加してください。");
    });
  });

  describe("異常系", () => {
    it("総授業回数が未記載でも15回を補完しない", () => {
      const draft = normalizeOk(buildRaw({ totalClassCount: missing() }));

      expect(draft.values.totalClassCount).toBe("");
      expect(draft.notes.totalClassCount.status).toBe("missing");
    });

    it("複数科目を検出したら拒否する", () => {
      const result = normalizeExtraction(buildRaw({ detectedSubjectCount: 2 }), INPUT);

      expect(result).toEqual({ ok: false, error: "multiple_subjects" });
    });

    it("根拠が入力文に存在しない値をフォームへ通さない", () => {
      const draft = normalizeOk(
        buildRaw({
          totalClassCount: field(30, "explicit", "全30回の授業"),
        }),
      );

      expect(draft.values.totalClassCount).toBe("");
      expect(draft.notes.totalClassCount.status).toBe("ambiguous");
    });

    it("出席率が範囲外なら値を捨てる", () => {
      const draft = normalizeOk(
        buildRaw({ attendanceRequiredRate: field(120, "explicit", "出席率80%以上") }),
      );

      // 0〜100へクランプされるため、120は100として扱われる。
      expect(draft.values.attendanceRequiredRate).toBe("100");
    });

    it("総授業回数が整数でなければ値を捨てる", () => {
      const draft = normalizeOk(buildRaw({ totalClassCount: field(15.5, "explicit", "全15回") }));

      expect(draft.values.totalClassCount).toBe("");
      expect(draft.notes.totalClassCount.status).toBe("ambiguous");
    });

    it("カテゴリが不正ならその他へ倒して要確認にする", () => {
      const draft = normalizeOk(
        buildRaw({
          gradeItems: [
            gradeItem({
              category: field("exam" as never, "explicit", "中間30%"),
              weight: field(100, "explicit", "中間30%"),
            }),
          ],
        }),
      );

      expect(draft.values.gradeItems[0].category).toBe("other");
      expect(draft.notes["gradeItems.0.category"].status).toBe("ambiguous");
    });

    it("評価割合が曖昧なら空欄にし、0を入れない", () => {
      const draft = normalizeOk(
        buildRaw({
          gradeItems: [gradeItem({ weight: { value: null, status: "ambiguous", evidence: null } })],
        }),
      );

      expect(draft.values.gradeItems[0].weight).toBe("");
    });

    it("合計が100%に満たなくても不足分の項目を追加しない", () => {
      const draft = normalizeOk(
        buildRaw({
          gradeItems: [gradeItem({ weight: field(90, "explicit", "中間30%") })],
        }),
      );

      expect(draft.values.gradeItems).toHaveLength(1);
      expect(draft.warnings.some((warning) => warning.includes("90%"))).toBe(true);
    });

    it("最大欠席数が総授業回数を超えていたら欠席数を捨てる", () => {
      const draft = normalizeOk(
        buildRaw({ attendanceMaxAbsences: field(20, "explicit", "3回まで欠席可能") }),
      );

      expect(draft.values.attendanceMaxAbsences).toBe("");
      expect(draft.warnings).toContain(
        "最大欠席数が総授業回数を超えていたため、値を空にしました。",
      );
    });

    it("必要出席率と最大欠席数が矛盾したら両方残して警告する", () => {
      // 15回中10回欠席可なら実質33%で、明記された80%と食い違う。
      const draft = normalizeOk(
        buildRaw({ attendanceMaxAbsences: field(10, "explicit", "3回まで欠席可能") }),
      );

      expect(draft.values.attendanceRequiredRate).toBe("80");
      expect(draft.values.attendanceMaxAbsences).toBe("10");
      expect(draft.warnings).toContain(
        "必要出席率と最大欠席数が一致しません。どちらが正しいか確認してください。",
      );
    });

    it("成績ラベルだけが取れた場合、目標点数を推測しない", () => {
      const draft = normalizeOk(buildRaw({ targetScore: missing() }));

      expect(draft.values.targetGradeLabel).toBe("B");
      expect(draft.values.targetScore).toBe("");
    });

    it("名前も割合も取れない評価項目を落とし、残りの添字を詰め直す", () => {
      const draft = normalizeOk(
        buildRaw({
          gradeItems: [
            gradeItem({
              name: { value: null, status: "ambiguous", evidence: null },
              weight: { value: null, status: "ambiguous", evidence: null },
            }),
            gradeItem({
              name: field("期末", "explicit", "期末70%"),
              weight: field(100, "explicit", "期末70%"),
            }),
          ],
        }),
      );

      expect(draft.values.gradeItems).toHaveLength(1);
      expect(draft.values.gradeItems[0].id).toBe("grade-item-0");
      expect(draft.values.gradeItems[0].name).toBe("期末");
      expect(draft.notes["gradeItems.0.name"].evidence).toBe("期末70%");
    });
  });
});
