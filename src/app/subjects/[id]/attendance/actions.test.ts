import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAttendanceFormState } from "@/lib/attendance/attendanceFormState";

const mocks = vi.hoisted(() => ({
  saveAttendanceRecord: vi.fn(),
  deleteAttendanceRecord: vi.fn(),
  getSubject: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/attendance", () => ({
  saveAttendanceRecord: mocks.saveAttendanceRecord,
  deleteAttendanceRecord: mocks.deleteAttendanceRecord,
}));
vi.mock("@/lib/supabase/queries/subjects", () => ({
  getSubject: mocks.getSubject,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteAttendanceAction, saveAttendanceAction } from "./actions";

const SAVED_RECORD = {
  id: "record-1",
  subjectId: "subject-1",
  classDate: "2026-04-10",
  status: "present" as const,
  memo: null,
};

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    subjectId: "subject-1",
    classDate: "2026-04-10",
    status: "present",
    memo: "",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return formData;
}

function runSave(formData: FormData) {
  return saveAttendanceAction(initialAttendanceFormState, formData);
}

function runDelete(formData: FormData) {
  return deleteAttendanceAction(initialAttendanceFormState, formData);
}

describe("saveAttendanceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubject.mockResolvedValue({ ok: true, subject: {}, gradeItems: [] });
    mocks.saveAttendanceRecord.mockResolvedValue({ ok: true, record: SAVED_RECORD });
  });

  describe("正常系", () => {
    it("入力値をクエリへ渡して保存する", async () => {
      const state = await runSave(buildFormData({ memo: "遅れて参加" }));

      expect(state.success).toBe(true);
      expect(mocks.saveAttendanceRecord).toHaveBeenCalledWith({
        subjectId: "subject-1",
        classDate: "2026-04-10",
        status: "present",
        memo: "遅れて参加",
      });
    });

    it.each(["present", "absent", "late", "excused"] as const)(
      "%s を保存できる",
      async (status) => {
        const state = await runSave(buildFormData({ status }));

        expect(state.success).toBe(true);
        expect(mocks.saveAttendanceRecord).toHaveBeenCalledWith(
          expect.objectContaining({ status }),
        );
      },
    );

    it("空のメモはNULLとして保存する", async () => {
      await runSave(buildFormData({ memo: "   " }));

      expect(mocks.saveAttendanceRecord).toHaveBeenCalledWith(
        expect.objectContaining({ memo: null }),
      );
    });

    it("科目詳細・出席画面・ダッシュボードを再検証する", async () => {
      await runSave(buildFormData());

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1/attendance");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("不正入力", () => {
    it("授業日が空なら保存しない", async () => {
      const state = await runSave(buildFormData({ classDate: "" }));

      expect(state.fieldErrors.classDate).toBeDefined();
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });

    it("存在しない日付を拒否する", async () => {
      const state = await runSave(buildFormData({ classDate: "2026-02-30" }));

      expect(state.fieldErrors.classDate).toBeDefined();
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });

    it("YYYY-MM-DD以外の書式を拒否する", async () => {
      const state = await runSave(buildFormData({ classDate: "2026/04/10" }));

      expect(state.fieldErrors.classDate).toBeDefined();
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });

    it("4状態にないステータスは読み取りエラーにする", async () => {
      const state = await runSave(buildFormData({ status: "unknown" }));

      expect(state.message).toContain("読み取れませんでした");
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });

    it("メモが長すぎる場合は保存しない", async () => {
      const state = await runSave(buildFormData({ memo: "あ".repeat(501) }));

      expect(state.fieldErrors.memo).toBeDefined();
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });

    it("検証エラーのときは所有権確認まで進まない", async () => {
      await runSave(buildFormData({ classDate: "" }));

      expect(mocks.getSubject).not.toHaveBeenCalled();
    });
  });

  describe("未認証", () => {
    it("再ログインを促し、保存しない", async () => {
      mocks.getSubject.mockResolvedValue({ ok: false, error: "unauthenticated" });

      const state = await runSave(buildFormData());

      expect(state.message).toContain("ログイン");
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("権限エラー", () => {
    it("他ユーザーの科目には記録できない", async () => {
      mocks.getSubject.mockResolvedValue({ ok: false, error: "not_found" });

      const state = await runSave(buildFormData({ subjectId: "others-subject" }));

      expect(state.message).toBe("対象の科目が見つかりません。");
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });

    it("科目の取得に失敗した場合も保存しない", async () => {
      mocks.getSubject.mockResolvedValue({ ok: false, error: "unknown" });

      const state = await runSave(buildFormData());

      expect(state.success).toBe(false);
      expect(mocks.saveAttendanceRecord).not.toHaveBeenCalled();
    });
  });

  describe("DB失敗", () => {
    it("制約違反は入力値の確認を促す", async () => {
      mocks.saveAttendanceRecord.mockResolvedValue({
        ok: false,
        error: "constraint_violation",
      });

      const state = await runSave(buildFormData());

      expect(state.message).toContain("制約");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });
});

describe("deleteAttendanceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteAttendanceRecord.mockResolvedValue({ ok: true });
  });

  it("記録IDを指定して削除し、関連画面を再検証する", async () => {
    const formData = new FormData();
    formData.set("recordId", "record-1");
    formData.set("subjectId", "subject-1");

    const state = await runDelete(formData);

    expect(state.success).toBe(true);
    expect(mocks.deleteAttendanceRecord).toHaveBeenCalledWith("record-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/subjects/subject-1");
  });

  it("記録IDが空なら削除しない", async () => {
    const formData = new FormData();
    formData.set("recordId", "");
    formData.set("subjectId", "subject-1");

    const state = await runDelete(formData);

    expect(state.message).toContain("指定されていません");
    expect(mocks.deleteAttendanceRecord).not.toHaveBeenCalled();
  });

  it("他ユーザーの記録は not_found として扱う", async () => {
    mocks.deleteAttendanceRecord.mockResolvedValue({ ok: false, error: "not_found" });

    const formData = new FormData();
    formData.set("recordId", "others-record");
    formData.set("subjectId", "subject-1");

    const state = await runDelete(formData);

    expect(state.message).toContain("見つかりません");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
