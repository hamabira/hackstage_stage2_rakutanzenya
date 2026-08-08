import { describe, expect, it } from "vitest";
import {
  LOGIN_MESSAGES,
  SIGNUP_MESSAGES,
  resolveLoginOutcome,
  resolveSignupOutcome,
  toLoginRedirectReason,
} from "./authMessages";

describe("resolveSignupOutcome", () => {
  it("セッションが返れば登録完了として扱う", () => {
    expect(
      resolveSignupOutcome({
        error: null,
        hasSession: true,
        hasUser: true,
        identitiesCount: 1,
      }),
    ).toBe("created");
  });

  it("Confirm emailが有効な環境ではメール確認待ちとして扱う", () => {
    expect(
      resolveSignupOutcome({
        error: null,
        hasSession: false,
        hasUser: true,
        identitiesCount: 1,
      }),
    ).toBe("needs_email_confirmation");
  });

  it("identitiesが空の応答は既存メールとして扱う", () => {
    // Supabase は既存メールでの登録時、情報を伏せるためエラーを返さない。
    expect(
      resolveSignupOutcome({
        error: null,
        hasSession: false,
        hasUser: true,
        identitiesCount: 0,
      }),
    ).toBe("already_registered");
  });

  it("既存メールのエラーコードを既存メールとして扱う", () => {
    expect(
      resolveSignupOutcome({
        error: { code: "user_already_exists" },
        hasSession: false,
        hasUser: false,
        identitiesCount: null,
      }),
    ).toBe("already_registered");
  });

  it("422応答も既存メールとして扱う", () => {
    expect(
      resolveSignupOutcome({
        error: { status: 422 },
        hasSession: false,
        hasUser: false,
        identitiesCount: null,
      }),
    ).toBe("already_registered");
  });

  it("パスワードが弱い場合は入力不備として扱う", () => {
    expect(
      resolveSignupOutcome({
        error: { code: "weak_password" },
        hasSession: false,
        hasUser: false,
        identitiesCount: null,
      }),
    ).toBe("invalid_credentials");
  });

  it("想定外のエラーは unknown_error として扱う", () => {
    expect(
      resolveSignupOutcome({
        error: { code: "over_request_rate_limit", status: 429 },
        hasSession: false,
        hasUser: false,
        identitiesCount: null,
      }),
    ).toBe("unknown_error");
  });
});

describe("resolveLoginOutcome", () => {
  it("セッションが返ればログイン成功として扱う", () => {
    expect(resolveLoginOutcome({ error: null, hasSession: true })).toBe("signed_in");
  });

  it("認証情報の誤りを区別する", () => {
    expect(
      resolveLoginOutcome({ error: { code: "invalid_credentials", status: 400 }, hasSession: false }),
    ).toBe("invalid_credentials");
  });

  it("メール未確認を区別する", () => {
    expect(
      resolveLoginOutcome({ error: { code: "email_not_confirmed" }, hasSession: false }),
    ).toBe("email_not_confirmed");
  });

  it("想定外のエラーは unknown_error として扱う", () => {
    expect(
      resolveLoginOutcome({ error: { code: "over_request_rate_limit", status: 429 }, hasSession: false }),
    ).toBe("unknown_error");
  });

  it("エラーが無くてもセッションが無ければ成功としない", () => {
    expect(resolveLoginOutcome({ error: null, hasSession: false })).toBe("unknown_error");
  });
});

describe("表示文言", () => {
  it("失敗時の文言に内部情報を含めない", () => {
    const messages = [...Object.values(SIGNUP_MESSAGES), ...Object.values(LOGIN_MESSAGES)];
    // Supabaseの原文・エラーコード・HTTPステータスが漏れていないことを確認する。
    const forbidden = /supabase|invalid_credentials|user_already_exists|weak_password|4\d\d|5\d\d/i;

    for (const message of messages) {
      expect(message).not.toMatch(forbidden);
    }
  });

  it("失敗時の文言が次に取るべき行動を含む", () => {
    for (const message of Object.values(SIGNUP_MESSAGES)) {
      expect(message).toMatch(/ください/);
    }

    for (const message of Object.values(LOGIN_MESSAGES)) {
      expect(message).toMatch(/ください/);
    }
  });

  it("メール確認待ちを失敗として表現しない", () => {
    expect(SIGNUP_MESSAGES.needs_email_confirmation).not.toMatch(/失敗/);
    expect(SIGNUP_MESSAGES.needs_email_confirmation).toMatch(/確認メール/);
  });
});

describe("toLoginRedirectReason", () => {
  it.each(["session_expired", "login_required"] as const)("%s を受け付ける", (reason) => {
    expect(toLoginRedirectReason(reason)).toBe(reason);
  });

  it("想定外の値は無視する", () => {
    // クエリ文字列経由で任意の文言を表示させられないことを確認する。
    expect(toLoginRedirectReason("<script>alert(1)</script>")).toBeNull();
    expect(toLoginRedirectReason(undefined)).toBeNull();
  });
});
