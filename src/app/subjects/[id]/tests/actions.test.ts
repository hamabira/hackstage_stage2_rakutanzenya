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
vi.mock("@/lib/supabase/queries/subjects", () => ({
  getSubject: mocks.getSubject,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteTestRecordAction, saveTestRecordAction } from "./actions";

const SAVED_RECORD = {
  id: "record-1",
  gradeItemId: "grade-item-1",
  score: 80,
  recordedAt: "2026-08-08",
  memo: null,
};

function ownedSubject(maxScore: number | null = 100) {
  return {
    ok: true,
    subject: { id: "subject-1" },
    gradeItems: [{ id: "grade-item-1", maxScore }],
  };
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    subjectId: "subject-1",
    gradeItemId: "grade-item-1",
    recordId: "",
    score: "80",
    recordedAt: "2026-08-08",
    memo: "",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return formData;
}

function runSave(formData: FormData) {
  return saveTestRecordAction(initialTestRecordFormState, formData);
}

function runDelete(formData: FormData) {
  return deleteTestRecordAction(initialTestRecordFormState, formData);
}

describe("saveTestRecordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubject.mockResolvedValue(ownedSubject());
    mocks.createTestRecord.mockResolvedValue({ ok: true, record: SAVED_RECORD });
    mocks.updateTestRecord.mockResolvedValue({ ok: true, record: SAVED_RECORD });
  });

  it("新しい点数記録を登録し、関連画面を再検証する", async () => {
    const state = await runSave(buildFormData({ memo: "中間試験" }));

    expect(state).toEqual({ fieldErrors: {}, message: null, success: true });
    expect(mocks.createTestRecord).toHaveBeenCalledWith({
      gradeItemId: "grade-item-1",
      score: 80,
      recordedAt: "2026-08-08",
      memo: "中間試験",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1/tests");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("recordIdがある場合は既存の点数記録を更新する", async () => {
    const state = await runSave(buildFormData({ recordId: "record-1", score: "90" }));

    expect(state.success).toBe(true);
    expect(mocks.updateTestRecord).toHaveBeenCalledWith("record-1", {
      score: 90,
      recordedAt: "2026-08-08",
      memo: null,
    });
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it.each(["-1", "80.001", "abc"])("不正な点数 %s では保存しない", async (score) => {
    const state = await runSave(buildFormData({ score }));

    expect(state.fieldErrors.score).toBeDefined();
    expect(mocks.getSubject).not.toHaveBeenCalled();
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it("実在しない記録日では保存しない", async () => {
    const state = await runSave(buildFormData({ recordedAt: "2026-02-30" }));

    expect(state.fieldErrors.recordedAt).toBeDefined();
    expect(mocks.getSubject).not.toHaveBeenCalled();
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it("満点を超える点数では保存しない", async () => {
    const state = await runSave(buildFormData({ score: "100.01" }));

    expect(state.fieldErrors.score).toBeDefined();
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it("満点未設定の評価項目には保存しない", async () => {
    mocks.getSubject.mockResolvedValue(ownedSubject(null));

    const state = await runSave(buildFormData());

    expect(state.fieldErrors.gradeItemId).toBeDefined();
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it("科目に属さない評価項目へ保存しない", async () => {
    const state = await runSave(buildFormData({ gradeItemId: "other-grade-item" }));

    expect(state.message).toContain("この科目に含まれていません");
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it("未認証では保存しない", async () => {
    mocks.getSubject.mockResolvedValue({ ok: false, error: "unauthenticated" });

    const state = await runSave(buildFormData());

    expect(state.message).toContain("ログイン");
    expect(mocks.createTestRecord).not.toHaveBeenCalled();
  });

  it("クエリ側の満点超過エラーを点数欄のエラーへ変換する", async () => {
    mocks.createTestRecord.mockResolvedValue({ ok: false, error: "invalid_score" });

    const state = await runSave(buildFormData());

    expect(state.fieldErrors.score).toBeDefined();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteTestRecordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubject.mockResolvedValue(ownedSubject());
    mocks.deleteTestRecord.mockResolvedValue({ ok: true });
  });

  it("本人の科目を確認して点数記録を削除し、関連画面を再検証する", async () => {
    const formData = new FormData();
    formData.set("subjectId", "subject-1");
    formData.set("recordId", "record-1");

    const state = await runDelete(formData);

    expect(state.success).toBe(true);
    expect(mocks.deleteTestRecord).toHaveBeenCalledWith("record-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1/tests");
  });

  it("他ユーザーの科目では削除しない", async () => {
    mocks.getSubject.mockResolvedValue({ ok: false, error: "not_found" });
    const formData = new FormData();
    formData.set("subjectId", "other-subject");
    formData.set("recordId", "record-1");

    const state = await runDelete(formData);

    expect(state.message).toContain("科目が見つかりません");
    expect(mocks.deleteTestRecord).not.toHaveBeenCalled();
  });
});
