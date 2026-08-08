import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialTestRecordFormState } from "@/lib/grades/testRecordFormState";

const mocks = vi.hoisted(() => ({
  createTestRecord: vi.fn(),
  updateTestRecord: vi.fn(),
  deleteTestRecord: vi.fn(),
  getSubject: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/grades", () => ({
  createTestRecord: mocks.createTestRecord,
  updateTestRecord: mocks.updateTestRecord,
  deleteTestRecord: mocks.deleteTestRecord,
}));
vi.mock("@/lib/supabase/queries/subjects", () => ({ getSubject: mocks.getSubject }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteTestRecordAction, saveTestRecordAction } from "./actions";

const GRADE_ITEM = {
  id: "item-1",
  subjectId: "subject-1",
  name: "中間テスト",
  category: "test" as const,
  weight: 100,
  maxScore: 100,
  sortOrder: 0,
};

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    recordId: "",
    gradeItemId: "item-1",
    score: "80",
    recordedAt: "2026-04-10",
    memo: "",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return formData;
}

function runSave(formData: FormData) {
  return saveTestRecordAction("subject-1", initialTestRecordFormState, formData);
}

describe("saveTestRecordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubject.mockResolvedValue({
      ok: true,
      subject: { id: "subject-1" },
      gradeItems: [GRADE_ITEM],
    });
    mocks.createTestRecord.mockResolvedValue({ ok: true, record: {} });
    mocks.updateTestRecord.mockResolvedValue({ ok: true, record: {} });
  });

  describe("正常系", () => {
    it("recordIdが空なら新規登録する", async () => {
      const state = await runSave(buildFormData({ memo: "見直し必要" }));

      expect(state.success).toBe(true);
      expect(mocks.createTestRecord).toHaveBeenCalledWith({
        gradeItemId: "item-1",
        score: 80,
        recordedAt: "2026-04-10",
        memo: "見直し必要",
      });
      expect(mocks.updateTestRecord).not.toHaveBeenCalled();
    });

    it("recordIdがあれば更新する", async () => {
      const state = await runSave(buildFormData({ recordId: "record-1", score: "95" }));

      expect(state.success).toBe(true);
      expect(mocks.updateTestRecord).toHaveBeenCalledWith("record-1", {
        score: 95,
        recordedAt: "2026-04-10",
        memo: null,
      });
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("空のメモはNULLとして保存する", async () => {
      await runSave(buildFormData({ memo: "   " }));

      expect(mocks.createTestRecord).toHaveBeenCalledWith(
        expect.objectContaining({ memo: null }),
      );
    });

    it("満点ちょうどは保存できる", async () => {
      const state = await runSave(buildFormData({ score: "100" }));

      expect(state.success).toBe(true);
    });

    it("科目詳細・記録画面・ダッシュボードを再検証する", async () => {
      await runSave(buildFormData());

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1/tests");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("不正入力", () => {
    it("満点を超える得点は保存しない", async () => {
      const state = await runSave(buildFormData({ score: "101" }));

      expect(state.fieldErrors.score).toContain("満点");
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("負の得点は保存しない", async () => {
      const state = await runSave(buildFormData({ score: "-1" }));

      expect(state.fieldErrors.score).toBeDefined();
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("数値以外の得点は保存しない", async () => {
      const state = await runSave(buildFormData({ score: "満点" }));

      expect(state.fieldErrors.score).toBeDefined();
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("存在しない実施日は保存しない", async () => {
      const state = await runSave(buildFormData({ recordedAt: "2026-02-30" }));

      expect(state.fieldErrors.recordedAt).toBeDefined();
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("メモが長すぎる場合は保存しない", async () => {
      const state = await runSave(buildFormData({ memo: "あ".repeat(501) }));

      expect(state.fieldErrors.memo).toBeDefined();
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });
  });

  describe("権限エラー", () => {
    it("他科目の評価項目IDを指定しても保存しない", async () => {
      const state = await runSave(buildFormData({ gradeItemId: "item-999" }));

      expect(state.message).toContain("評価項目がこの科目に存在しません");
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("他ユーザーの科目には記録できない", async () => {
      mocks.getSubject.mockResolvedValue({ ok: false, error: "not_found" });

      const state = await runSave(buildFormData());

      expect(state.message).toBe("対象の科目が見つかりません。");
      expect(mocks.createTestRecord).not.toHaveBeenCalled();
    });

    it("未認証なら再ログインを促す", async () => {
      mocks.getSubject.mockResolvedValue({ ok: false, error: "unauthenticated" });

      const state = await runSave(buildFormData());

      expect(state.message).toContain("ログイン");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("DB失敗", () => {
    it("満点未設定の評価項目は理由を伝える", async () => {
      mocks.createTestRecord.mockResolvedValue({ ok: false, error: "missing_max_score" });

      const state = await runSave(buildFormData());

      expect(state.message).toContain("満点が設定されていません");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });
});

describe("deleteTestRecordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteTestRecord.mockResolvedValue({ ok: true });
  });

  it("記録IDを指定して削除し、関連画面を再検証する", async () => {
    const formData = new FormData();
    formData.set("recordId", "record-1");

    const state = await deleteTestRecordAction(
      "subject-1",
      initialTestRecordFormState,
      formData,
    );

    expect(state.success).toBe(true);
    expect(mocks.deleteTestRecord).toHaveBeenCalledWith("record-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1");
  });

  it("記録IDが空なら削除しない", async () => {
    const formData = new FormData();
    formData.set("recordId", "");

    const state = await deleteTestRecordAction(
      "subject-1",
      initialTestRecordFormState,
      formData,
    );

    expect(state.message).toContain("指定されていません");
    expect(mocks.deleteTestRecord).not.toHaveBeenCalled();
  });

  it("他ユーザーの記録は not_found として扱う", async () => {
    mocks.deleteTestRecord.mockResolvedValue({ ok: false, error: "not_found" });

    const formData = new FormData();
    formData.set("recordId", "others-record");

    const state = await deleteTestRecordAction(
      "subject-1",
      initialTestRecordFormState,
      formData,
    );

    expect(state.message).toContain("見つかりません");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
