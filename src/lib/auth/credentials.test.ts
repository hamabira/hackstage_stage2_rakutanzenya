import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  getCredentials,
  isSignupPasswordValid,
} from "./credentials";

describe("getCredentials", () => {
  it("メールアドレス前後の空白を除いて認証情報を返す", () => {
    const formData = new FormData();
    formData.set("email", " user@example.com ");
    formData.set("password", "password");

    expect(getCredentials(formData)).toEqual({
      email: "user@example.com",
      password: "password",
    });
  });
});

describe("isSignupPasswordValid", () => {
  it("8文字以上を受け付ける", () => {
    expect(isSignupPasswordValid("a".repeat(MIN_PASSWORD_LENGTH))).toBe(true);
  });

  it("8文字未満を拒否する", () => {
    expect(isSignupPasswordValid("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
  });
});
