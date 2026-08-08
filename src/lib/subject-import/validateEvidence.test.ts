import { describe, expect, it } from "vitest";
import type { ExtractedField } from "./types";
import { isEvidenceFound, normalizeForMatch, verifyField } from "./validateEvidence";

const INPUT = "線形代数\n全15回の授業を行う。出席率80%以上が必要。中間30%、期末70%。";

describe("normalizeForMatch", () => {
  it("空白を除去して小文字へ揃える", () => {
    expect(normalizeForMatch(" Mid Term ")).toBe("midterm");
  });

  it("全角を半角へ揃える", () => {
    expect(normalizeForMatch("８０％")).toBe("80%");
  });
});

describe("isEvidenceFound", () => {
  describe("正常系", () => {
    it("完全一致する引用を検出する", () => {
      expect(isEvidenceFound("出席率80%以上", INPUT)).toBe(true);
    });

    it("全角と半角の差を吸収して一致させる", () => {
      expect(isEvidenceFound("出席率８０％以上", INPUT)).toBe(true);
    });

    it("空白の有無を無視して一致させる", () => {
      expect(isEvidenceFound("中間 30%", INPUT)).toBe(true);
    });
  });

  describe("異常系", () => {
    it("入力に存在しない引用を検出しない", () => {
      expect(isEvidenceFound("レポート50%", INPUT)).toBe(false);
    });

    it("空文字の引用を検出しない", () => {
      expect(isEvidenceFound("", INPUT)).toBe(false);
      expect(isEvidenceFound("   ", INPUT)).toBe(false);
    });
  });
});

describe("verifyField", () => {
  describe("正常系", () => {
    it("根拠が実在する explicit をそのまま通す", () => {
      const field: ExtractedField<number> = {
        value: 80,
        status: "explicit",
        evidence: "出席率80%以上",
      };

      expect(verifyField(field, INPUT)).toEqual(field);
    });

    it("根拠が実在する derived をそのまま通す", () => {
      const field: ExtractedField<number> = {
        value: 15,
        status: "derived",
        evidence: "全15回",
      };

      expect(verifyField(field, INPUT)).toEqual(field);
    });

    it("missing は根拠がなくてもそのまま通す", () => {
      const field: ExtractedField<number> = { value: null, status: "missing", evidence: null };

      expect(verifyField(field, INPUT)).toEqual(field);
    });

    it("ambiguous はそのまま通す", () => {
      const field: ExtractedField<number> = { value: null, status: "ambiguous", evidence: null };

      expect(verifyField(field, INPUT)).toEqual(field);
    });
  });

  describe("異常系", () => {
    it("入力に存在しない根拠の explicit を ambiguous へ降格し値を捨てる", () => {
      const field: ExtractedField<number> = {
        value: 50,
        status: "explicit",
        evidence: "レポート50%で評価する",
      };

      expect(verifyField(field, INPUT)).toEqual({
        value: null,
        status: "ambiguous",
        evidence: null,
      });
    });

    it("根拠がnullの explicit を降格する", () => {
      const field: ExtractedField<string> = { value: "捏造", status: "explicit", evidence: null };

      expect(verifyField(field, INPUT)).toEqual({
        value: null,
        status: "ambiguous",
        evidence: null,
      });
    });

    it("根拠が空文字の derived を降格する", () => {
      const field: ExtractedField<number> = { value: 66.67, status: "derived", evidence: "  " };

      expect(verifyField(field, INPUT)).toEqual({
        value: null,
        status: "ambiguous",
        evidence: null,
      });
    });
  });
});
