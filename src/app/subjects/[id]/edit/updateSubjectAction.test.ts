import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialSubjectFormState } from "@/lib/subjects/subjectFormState";

const mocks = vi.hoisted(() => ({
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  redirect: vi.fn((path: string) => {
    // 本物の redirect と同じく、以降の処理を止めるためにエラーを投げる。
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/subjects", () => ({
  updateSubject: mocks.updateSubject,
  deleteSubject: mocks.deleteSubject,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { updateSubjectAction } = await import("./actions");

/** 保存済み評価項目1件と新規1件を含むFormDataを作る。 */
function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    name: "線形代数",
    totalClassCount: "15",
    attendanceRequiredRate: "80",
    attendanceMaxAbsences: "3",
    targetGradeLabel: "優",
    targetScore: "80",
    "gradeItems[0][id]": "item-1",
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

function runUpdate(formData: FormData) {
  return updateSubjectAction("subject-1", initialSubjectFormState, formData);
}

describe("updateSubjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSubject.mockResolvedValue({
      ok: true,
      subjectId: "subject-1",
      subject: {},
      gradeItems: [],
    });
  });

  describe("正常系", () => {
    it("保存済み項目にはIDを付け、新規項目にはIDを付けずに更新する", async () => {
      await expect(runUpdate(buildFormData())).rejects.toThrow("NEXT_REDIRECT");

      expect(mocks.updateSubject).toHaveBeenCalledWith("subject-1", {
        name: "線形代数",
        totalClassCount: 15,
        attendanceRequiredRate: 80,
        attendanceMaxAbsences: 3,
        attendanceAffectsGrade: false,
        targetGradeLabel: "優",
        targetScore: 80,
        gradeItems: [
          {
            id: "item-1",
            name: "中間テスト",
            category: "test",
            weight: 40,
            maxScore: 100,
            sortOrder: 0,
          },
          {
            name: "期末テスト",
            category: "test",
            weight: 60,
            maxScore: 100,
            sortOrder: 1,
          },
        ],
      });
    });

    it("URLの科目IDを使い、フォームの入力からは差し替えられない", async () => {
      const formData = buildFormData();
      formData.set("subjectId", "others-subject");

      await expect(runUpdate(formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(mocks.updateSubject).toHaveBeenCalledWith("subject-1", expect.anything());
    });

    it("更新後に関連画面を再検証し、科目詳細へ遷移する", async () => {
      await expect(runUpdate(buildFormData())).rejects.toThrow("NEXT_REDIRECT");

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(mocks.redirect).toHaveBeenCalledWith("/subjects/subject-1");
    });

    it("評価項目を1件に減らした場合、その1件だけを送る", async () => {
      const formData = buildFormData({ "gradeItems[0][weight]": "100" });
      for (const key of ["id", "name", "category", "weight", "maxScore"]) {
        formData.delete(`gradeItems[1][${key}]`);
      }

      await expect(runUpdate(formData)).rejects.toThrow("NEXT_REDIRECT");

      const input = mocks.updateSubject.mock.calls[0][1];
      expect(input.gradeItems).toHaveLength(1);
      expect(input.gradeItems[0].id).toBe("item-1");
    });
  });

  describe("不正入力", () => {
    it("評価割合の合計が100%でなければ更新しない", async () => {
      const state = await runUpdate(buildFormData({ "gradeItems[1][weight]": "10" }));

      expect(state.fieldErrors.gradeItems).toBeDefined();
      expect(mocks.updateSubject).not.toHaveBeenCalled();
    });

    it("科目名が空なら更新しない", async () => {
      const state = await runUpdate(buildFormData({ name: "" }));

      expect(state.fieldErrors.name).toBeDefined();
      expect(mocks.updateSubject).not.toHaveBeenCalled();
    });
  });

  describe("権限・DB失敗", () => {
    it("他ユーザーの科目は not_found として扱う", async () => {
      mocks.updateSubject.mockResolvedValue({ ok: false, error: "not_found" });

      const state = await runUpdate(buildFormData());

      expect(state.message).toContain("見つかりません");
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it("権限エラーを利用者向けの文言で返す", async () => {
      mocks.updateSubject.mockResolvedValue({ ok: false, error: "forbidden" });

      const state = await runUpdate(buildFormData());

      expect(state.message).toContain("権限");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("制約違反は入力値の確認を促す", async () => {
      mocks.updateSubject.mockResolvedValue({ ok: false, error: "constraint_violation" });

      const state = await runUpdate(buildFormData());

      expect(state.message).toContain("制約");
    });
  });
});
