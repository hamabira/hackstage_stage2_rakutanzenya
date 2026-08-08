import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialDeleteSubjectFormState } from "@/lib/subjects/deleteSubjectFormState";
import type { DeleteSubjectResult } from "@/lib/supabase/queries/subjects";

const deleteSubject = vi.fn<() => Promise<DeleteSubjectResult>>();
const revalidatePath = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("@/lib/supabase/queries/subjects", () => ({
  deleteSubject: (...args: unknown[]) => deleteSubject(...(args as [])),
}));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

const { deleteSubjectAction } = await import("./actions");

function runAction(subjectId: string) {
  return deleteSubjectAction(subjectId, initialDeleteSubjectFormState, new FormData());
}

describe("deleteSubjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteSubject.mockResolvedValue({ ok: true });
  });

  it("削除後に関連画面を再検証して科目一覧へ遷移する", async () => {
    await expect(runAction("subject-1")).rejects.toThrow("NEXT_REDIRECT:/subjects");

    expect(deleteSubject).toHaveBeenCalledWith("subject-1");
    expect(revalidatePath).toHaveBeenCalledWith("/subjects");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/subjects/subject-1");
    expect(revalidatePath).toHaveBeenCalledWith("/subjects/subject-1/edit");
    expect(redirect).toHaveBeenCalledWith("/subjects");
  });

  it("削除対象が空なら削除しない", async () => {
    await expect(runAction(" ")).resolves.toEqual({ message: "削除対象の科目が指定されていません。" });
    expect(deleteSubject).not.toHaveBeenCalled();
  });

  it("削除対象がない場合は画面用のエラーを返す", async () => {
    deleteSubject.mockResolvedValue({ ok: false, error: "not_found" });

    await expect(runAction("subject-1")).resolves.toEqual({
      message: "対象の科目が見つかりません。画面を再読み込みしてください。",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("未ログイン時は再ログインを促す", async () => {
    deleteSubject.mockResolvedValue({ ok: false, error: "unauthenticated" });

    await expect(runAction("subject-1")).resolves.toEqual({
      message: "ログインの有効期限が切れています。もう一度ログインしてください。",
    });
  });
});
