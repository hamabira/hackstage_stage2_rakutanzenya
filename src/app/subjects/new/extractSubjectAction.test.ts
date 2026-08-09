import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractSubjectResult } from "@/lib/subject-import/extractSubject";
import type { ExtractedSubjectDraft } from "@/lib/subject-import/types";

const getUser = vi.fn();
const extractSubject = vi.fn<() => Promise<ExtractSubjectResult>>();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@/lib/subject-import/extractSubject", () => ({
  extractSubject: (...args: unknown[]) => extractSubject(...(args as [])),
}));

const { extractSubjectAction } = await import("./extractSubjectAction");

function field(value: unknown, status = "explicit", evidence: string | null = "全15回") {
  return { value, status, evidence };
}

const INPUT = "線形代数 全15回 中間30% 期末70%";

/** 入力文と辻褄が合う抽出結果。根拠検証を通る。 */
const DRAFT = {
  subjectName: field("線形代数", "explicit", "線形代数"),
  totalClassCount: field(15, "explicit", "全15回"),
  attendanceRequiredRate: { value: null, status: "missing", evidence: null },
  attendanceMaxAbsences: { value: null, status: "missing", evidence: null },
  attendanceAffectsGrade: { value: null, status: "missing", evidence: null },
  targetGradeLabel: { value: null, status: "missing", evidence: null },
  targetScore: { value: null, status: "missing", evidence: null },
  gradeItems: [
    {
      name: field("中間", "explicit", "中間30%"),
      category: field("test", "explicit", "中間30%"),
      weight: field(30, "explicit", "中間30%"),
      maxScore: field(100, "derived", "中間30%"),
    },
    {
      name: field("期末", "explicit", "期末70%"),
      category: field("test", "explicit", "期末70%"),
      weight: field(70, "explicit", "期末70%"),
      maxScore: field(100, "derived", "期末70%"),
    },
  ],
  detectedSubjectCount: 1,
} as unknown as ExtractedSubjectDraft;

describe("extractSubjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    extractSubject.mockResolvedValue({ ok: true, draft: DRAFT, attempts: 1 });
  });

  describe("正常系", () => {
    it("抽出結果をフォームの値へ変換して返す", async () => {
      const result = await extractSubjectAction(INPUT);

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("成功するはず");
      }
      expect(result.draft.values.name).toBe("線形代数");
      expect(result.draft.values.totalClassCount).toBe("15");
      expect(result.draft.values.gradeItems).toHaveLength(2);
    });

    it("正規化した入力をAIへ渡す", async () => {
      await extractSubjectAction("  線形代数   全15回\r\n中間30% 期末70%  ");

      expect(extractSubject).toHaveBeenCalledWith("線形代数 全15回\n中間30% 期末70%");
    });
  });

  describe("異常系", () => {
    it("未認証ならAIを呼ばない", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await extractSubjectAction(INPUT);

      expect(result).toEqual({
        ok: false,
        message: "ログインの有効期限が切れています。再度ログインしてください。",
      });
      expect(extractSubject).not.toHaveBeenCalled();
    });

    it("認証エラーならAIを呼ばない", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: new Error("failed") });

      const result = await extractSubjectAction(INPUT);

      expect(result.ok).toBe(false);
      expect(extractSubject).not.toHaveBeenCalled();
    });

    it("空入力ならAIを呼ばない", async () => {
      const result = await extractSubjectAction("   \n  ");

      expect(result).toEqual({ ok: false, message: "解析する文章を入力してください。" });
      expect(extractSubject).not.toHaveBeenCalled();
    });

    it("上限を超える入力ならAIを呼ばない", async () => {
      const result = await extractSubjectAction("あ".repeat(2_001));

      expect(result).toEqual({ ok: false, message: "入力は2,000文字以内にしてください。" });
      expect(extractSubject).not.toHaveBeenCalled();
    });

    it("極端に長い入力を正規化前に弾く", async () => {
      const result = await extractSubjectAction("あ".repeat(100_000));

      expect(result.ok).toBe(false);
      expect(extractSubject).not.toHaveBeenCalled();
    });

    it("複数科目を検出したら1科目ずつ入力するよう促す", async () => {
      extractSubject.mockResolvedValue({
        ok: true,
        draft: { ...DRAFT, detectedSubjectCount: 2 },
        attempts: 1,
      });

      const result = await extractSubjectAction(INPUT);

      expect(result).toEqual({
        ok: false,
        message: "複数の科目が含まれているようです。1科目ずつ入力してください。",
      });
    });

    it.each([
      ["invalid_response", "解析結果を読み取れませんでした。文章を整理して再度お試しください。"],
      ["timeout", "解析に時間がかかりすぎました。文章を短くして再度お試しください。"],
      ["provider_error", "解析サービスに接続できませんでした。時間をおいて再度お試しください。"],
      ["not_configured", "AI解析は現在利用できません。手動で登録してください。"],
    ])("抽出エラー %s を日本語メッセージへ変換する", async (error, message) => {
      extractSubject.mockResolvedValue({ ok: false, error } as ExtractSubjectResult);

      const result = await extractSubjectAction(INPUT);

      expect(result).toEqual({ ok: false, message });
    });
  });
});
