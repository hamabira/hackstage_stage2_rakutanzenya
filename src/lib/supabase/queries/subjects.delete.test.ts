import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { deleteSubject } from "./subjects";

function createDeleteClient(result: { data: object[] | null; error: { code?: string } | null }) {
  const select = vi.fn().mockResolvedValue(result);
  const userIdFilter = vi.fn(() => ({ select }));
  const subjectIdFilter = vi.fn(() => ({ eq: userIdFilter }));
  const remove = vi.fn(() => ({ eq: subjectIdFilter }));

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    from: vi.fn(() => ({ delete: remove })),
    subjectIdFilter,
    userIdFilter,
  };
}

describe("deleteSubject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("本人の科目だけをidとuser_idで絞り込んで削除する", async () => {
    const client = createDeleteClient({ data: [{ id: "subject-1" }], error: null });
    mocks.createClient.mockResolvedValue(client);

    await expect(deleteSubject("subject-1")).resolves.toEqual({ ok: true });
    expect(client.subjectIdFilter).toHaveBeenCalledWith("id", "subject-1");
    expect(client.userIdFilter).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("本人が所有しない科目は削除できない", async () => {
    const client = createDeleteClient({ data: [], error: null });
    mocks.createClient.mockResolvedValue(client);

    await expect(deleteSubject("other-subject")).resolves.toEqual({ ok: false, error: "not_found" });
  });

  it("未ログイン時は削除クエリを実行しない", async () => {
    const from = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from,
    });

    await expect(deleteSubject("subject-1")).resolves.toEqual({ ok: false, error: "unauthenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("DBエラーを呼び出し側が扱えるエラー種別へ変換する", async () => {
    const client = createDeleteClient({ data: null, error: { code: "23514" } });
    mocks.createClient.mockResolvedValue(client);

    await expect(deleteSubject("subject-1")).resolves.toEqual({
      ok: false,
      error: "constraint_violation",
    });
  });
});
