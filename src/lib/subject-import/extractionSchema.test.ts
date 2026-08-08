import { describe, expect, it } from "vitest";
import {
  EXTRACTION_RESPONSE_SCHEMA,
  isExtractedSubjectDraft,
  MAX_GRADE_ITEMS,
} from "./extractionSchema";

function field(value: unknown, status = "explicit", evidence: string | null = "根拠") {
  return { value, status, evidence };
}

/** 型ガードを通る最小構成を作り、overridesで一部だけ壊せるようにする。 */
function buildDraft(overrides: Record<string, unknown> = {}) {
  return {
    subjectName: field("線形代数"),
    totalClassCount: field(15),
    attendanceRequiredRate: field(80),
    attendanceMaxAbsences: field(3),
    attendanceAffectsGrade: field(true),
    targetGradeLabel: field("B"),
    targetScore: field(80),
    gradeItems: [
      {
        name: field("中間試験"),
        category: field("test"),
        weight: field(30),
        maxScore: field(100),
      },
    ],
    detectedSubjectCount: 1,
    ...overrides,
  };
}

describe("isExtractedSubjectDraft", () => {
  describe("正常系", () => {
    it("正しい形のオブジェクトを受け入れる", () => {
      expect(isExtractedSubjectDraft(buildDraft())).toBe(true);
    });

    it("valueがnullでも受け入れる", () => {
      expect(
        isExtractedSubjectDraft(
          buildDraft({ totalClassCount: field(null, "missing", null) }),
        ),
      ).toBe(true);
    });

    it("評価項目が空配列でも受け入れる", () => {
      expect(isExtractedSubjectDraft(buildDraft({ gradeItems: [] }))).toBe(true);
    });
  });

  describe("異常系", () => {
    it("オブジェクト以外を拒否する", () => {
      expect(isExtractedSubjectDraft(null)).toBe(false);
      expect(isExtractedSubjectDraft("draft")).toBe(false);
      expect(isExtractedSubjectDraft([])).toBe(false);
    });

    it("statusが未知の文字列なら拒否する", () => {
      expect(isExtractedSubjectDraft(buildDraft({ subjectName: field("A", "guessed") }))).toBe(
        false,
      );
    });

    it("ExtractedFieldのキーが欠けていれば拒否する", () => {
      expect(
        isExtractedSubjectDraft(buildDraft({ subjectName: { value: "A", status: "explicit" } })),
      ).toBe(false);
    });

    it("数値項目に文字列が入っていれば拒否する", () => {
      expect(isExtractedSubjectDraft(buildDraft({ totalClassCount: field("15") }))).toBe(false);
    });

    it("数値項目がNaNなら拒否する", () => {
      expect(isExtractedSubjectDraft(buildDraft({ targetScore: field(Number.NaN) }))).toBe(false);
    });

    it("gradeItemsが配列でなければ拒否する", () => {
      expect(isExtractedSubjectDraft(buildDraft({ gradeItems: {} }))).toBe(false);
    });

    it("評価項目の中身が壊れていれば拒否する", () => {
      expect(
        isExtractedSubjectDraft(
          buildDraft({ gradeItems: [{ name: field("中間"), category: field("test") }] }),
        ),
      ).toBe(false);
    });

    it("評価項目が上限を超えていれば拒否する", () => {
      const items = Array.from({ length: MAX_GRADE_ITEMS + 1 }, () => ({
        name: field("項目"),
        category: field("test"),
        weight: field(1),
        maxScore: field(100),
      }));

      expect(isExtractedSubjectDraft(buildDraft({ gradeItems: items }))).toBe(false);
    });

    it("detectedSubjectCountが整数でなければ拒否する", () => {
      expect(isExtractedSubjectDraft(buildDraft({ detectedSubjectCount: 1.5 }))).toBe(false);
      expect(isExtractedSubjectDraft(buildDraft({ detectedSubjectCount: "1" }))).toBe(false);
    });

    it("evidenceが文字列でもnullでもなければ拒否する", () => {
      expect(isExtractedSubjectDraft(buildDraft({ subjectName: field("A", "explicit", 1 as never) }))).toBe(
        false,
      );
    });
  });
});

describe("EXTRACTION_RESPONSE_SCHEMA", () => {
  /** Geminiが解釈しないキーを使っていないか、スキーマ全体を再帰的に確認する。 */
  function collectKeys(value: unknown, keys: Set<string>): Set<string> {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectKeys(item, keys);
      }
      return keys;
    }

    if (typeof value === "object" && value !== null) {
      for (const [key, child] of Object.entries(value)) {
        keys.add(key);
        collectKeys(child, keys);
      }
    }

    return keys;
  }

  it("Geminiが非対応のキーを含まない", () => {
    const keys = collectKeys(EXTRACTION_RESPONSE_SCHEMA, new Set<string>());

    for (const unsupported of ["$ref", "anyOf", "oneOf", "allOf", "additionalProperties", "const"]) {
      expect(keys.has(unsupported)).toBe(false);
    }
  });

  it("maxItemsを含まない", () => {
    // 実APIでは maxItems を含むと INVALID_ARGUMENT(400) になる。
    // 件数の上限は isExtractedSubjectDraft 側で確認する。
    const keys = collectKeys(EXTRACTION_RESPONSE_SCHEMA, new Set<string>());

    expect(keys.has("maxItems")).toBe(false);
    expect(keys.has("minItems")).toBe(false);
  });

  it("トップレベルの必須項目がすべて宣言されている", () => {
    expect(EXTRACTION_RESPONSE_SCHEMA.required).toEqual([
      "subjectName",
      "totalClassCount",
      "attendanceRequiredRate",
      "attendanceMaxAbsences",
      "attendanceAffectsGrade",
      "targetGradeLabel",
      "targetScore",
      "gradeItems",
      "detectedSubjectCount",
    ]);
  });

  it("値がnullを返せるようnullableを指定している", () => {
    const subjectName = EXTRACTION_RESPONSE_SCHEMA.properties.subjectName;

    expect(subjectName.properties.value.nullable).toBe(true);
    expect(subjectName.properties.evidence.nullable).toBe(true);
  });

  it("カテゴリをenumで4種類に限定している", () => {
    const category = EXTRACTION_RESPONSE_SCHEMA.properties.gradeItems.items.properties.category;

    expect(category.properties.value.enum).toEqual([
      "attendance",
      "assignment",
      "test",
      "other",
    ]);
  });
});
