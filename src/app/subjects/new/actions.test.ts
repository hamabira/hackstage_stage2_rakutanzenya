import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialSubjectFormState } from "@/lib/subjects/subjectFormState";
import type { CreateSubjectResult } from "@/lib/supabase/queries/subjects";

const createSubject = vi.fn<() => Promise<CreateSubjectResult>>();
const redirect = vi.fn((path: string) => {
  // 本物の redirect と同じく、以降の処理を止めるためにエラーを投げる。
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const revalidatePath = vi.fn();

vi.mock("@/lib/supabase/queries/subjects", () => ({
  createSubject: (...args: unknown[]) => createSubject(...(args as [])),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));

const { createSubjectAction } = await import("./actions");

/** 有効な入力のFormDataを作り、overridesで一部だけ壊せるようにする。 */
function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    name: "線形代数",
    totalClassCount: "15",
    attendanceRequiredRate: "80",
    attendanceMaxAbsences: "3",
    targetGradeLabel: "優",
    targetScore: "80",
    "gradeItems[0][name]": "中間テスト",
    "gradeItems[0][category]": "test",
    "gradeItems[0][weight]": "40",
    "gradeItems[0][maxScore]": "100",
    "gradeItems[1][name]": "期末テスト",
    "gradeItems[1][category]": "test",
    "gradeItems[1][weight]": "60",
    "gradeItems[1][maxScore]": "100",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return formData;
}

/** redirect が投げるエラーを飲み込み、Actionの戻り値だけを取り出す。 */
async function runAction(formData: FormData) {
  return createSubjectAction(initialSubjectFormState, formData);
}

describe("createSubjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSubject.mockResolvedValue({ ok: true, subjectId: "subject-1" });
  });

  describe("正常系", () => {
    it("入力値を変換して保存する", async () => {
      await expect(runAction(buildFormData())).rejects.toThrow("NEXT_REDIRECT");

      expect(createSubject).toHaveBeenCalledWith({
        name: "線形代数",
        totalClassCount: 15,
        attendanceRequiredRate: 80,
        attendanceMaxAbsences: 3,
        attendanceAffectsGrade: false,
        targetGradeLabel: "優",
        targetScore: 80,
        gradeItems: [
          { name: "中間テスト", category: "test", weight: 40, maxScore: 100, sortOrder: 0 },
          { name: "期末テスト", category: "test", weight: 60, maxScore: 100, sortOrder: 1 },
        ],
      });
    });

    it("空欄の任意項目をnullとして保存する", async () => {
      const formData = buildFormData({
        attendanceRequiredRate: "",
        attendanceMaxAbsences: "",
        targetGradeLabel: "",
        targetScore: "",
      });

      await expect(runAction(formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(createSubject).toHaveBeenCalledWith(
        expect.objectContaining({
          attendanceRequiredRate: null,
          attendanceMaxAbsences: null,
          targetGradeLabel: null,
          targetScore: null,
        }),
      );
    });

    it("保存後に一覧とダッシュボードを再検証し、科目詳細へ遷移する", async () => {
      await expect(runAction(buildFormData())).rejects.toThrow("NEXT_REDIRECT");

      expect(revalidatePath).toHaveBeenCalledWith("/subjects");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(redirect).toHaveBeenCalledWith("/subjects/subject-1");
    });
  });

  describe("不正入力", () => {
    it("必須項目が空ならフィールドエラーを返し、保存しない", async () => {
      const state = await runAction(buildFormData({ name: "" }));

      expect(state.fieldErrors.name).toBeDefined();
      expect(createSubject).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("評価割合の合計が100%でなければ保存しない", async () => {
      const state = await runAction(buildFormData({ "gradeItems[1][weight]": "10" }));

      expect(state.fieldErrors.gradeItems).toBe("評価割合の合計を100%にしてください。");
      expect(createSubject).not.toHaveBeenCalled();
    });

    it("総授業回数が0以下なら保存しない", async () => {
      const state = await runAction(buildFormData({ totalClassCount: "0" }));

      expect(state.fieldErrors.totalClassCount).toBeDefined();
      expect(createSubject).not.toHaveBeenCalled();
    });

    it("最大欠席数が総授業回数を超えるなら保存しない", async () => {
      const state = await runAction(buildFormData({ attendanceMaxAbsences: "16" }));

      expect(state.fieldErrors.attendanceMaxAbsences).toBeDefined();
      expect(createSubject).not.toHaveBeenCalled();
    });

    it("選択肢にないカテゴリを送られた場合は読み取りエラーにする", async () => {
      const state = await runAction(buildFormData({ "gradeItems[0][category]": "bonus" }));

      expect(state.message).toContain("読み取れませんでした");
      expect(createSubject).not.toHaveBeenCalled();
    });
  });

  describe("未認証", () => {
    it("再ログインを促すメッセージを返し、遷移しない", async () => {
      createSubject.mockResolvedValue({ ok: false, error: "unauthenticated" });

      const state = await runAction(buildFormData());

      expect(state.message).toContain("ログイン");
      expect(state.fieldErrors).toEqual({});
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("DB失敗", () => {
    it("制約違反は入力値の確認を促す", async () => {
      createSubject.mockResolvedValue({ ok: false, error: "constraint_violation" });

      const state = await runAction(buildFormData());

      expect(state.message).toContain("制約");
      expect(redirect).not.toHaveBeenCalled();
    });

    it("原因不明の失敗は再試行を促す", async () => {
      createSubject.mockResolvedValue({ ok: false, error: "unknown" });

      const state = await runAction(buildFormData());

      expect(state.message).toContain("保存に失敗");
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
