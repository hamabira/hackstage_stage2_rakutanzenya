/**
 * 認証結果の判定と、利用者向け文言への変換をまとめる。
 * Supabaseのエラーメッセージをそのまま画面へ出すと内部情報が露出するため、
 * ここで定義した文言だけを表示する。
 */

export type SignupOutcome =
  | "created"
  | "needs_email_confirmation"
  | "already_registered"
  | "invalid_credentials"
  | "unknown_error";

export type LoginOutcome =
  | "signed_in"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "unknown_error";

/** 未認証でページ保護に弾かれた理由。 */
export type LoginRedirectReason = "session_expired" | "login_required";

interface AuthErrorLike {
  code?: string;
  status?: number;
}

interface SignupResponseLike {
  error: AuthErrorLike | null;
  hasSession: boolean;
  /** サインアップ応答のユーザー。Confirm email が有効な場合もここには値が入る。 */
  hasUser: boolean;
  /**
   * 応答に含まれる identities の件数。
   * Supabase は既存メールでの登録時、情報を伏せるために
   * エラーではなく identities が空のユーザーを返す。
   */
  identitiesCount: number | null;
}

interface LoginResponseLike {
  error: AuthErrorLike | null;
  hasSession: boolean;
}

const ALREADY_REGISTERED_CODES = new Set(["user_already_exists", "email_exists"]);
const INVALID_CREDENTIAL_CODES = new Set([
  "weak_password",
  "validation_failed",
  "invalid_credentials",
]);

/** サインアップ応答から、利用者へ伝えるべき結果を判定する。 */
export function resolveSignupOutcome(response: SignupResponseLike): SignupOutcome {
  if (response.error) {
    if (
      (response.error.code !== undefined &&
        ALREADY_REGISTERED_CODES.has(response.error.code)) ||
      response.error.status === 422
    ) {
      return "already_registered";
    }

    return response.error.code !== undefined &&
      INVALID_CREDENTIAL_CODES.has(response.error.code)
      ? "invalid_credentials"
      : "unknown_error";
  }

  // 既存メールの場合、エラーではなく identities が空のユーザーが返る。
  if (response.identitiesCount === 0) {
    return "already_registered";
  }

  if (response.hasSession) {
    return "created";
  }

  // ユーザーは作られたがセッションが無い = Confirm email が有効な環境。
  return response.hasUser ? "needs_email_confirmation" : "unknown_error";
}

/** ログイン応答から、利用者へ伝えるべき結果を判定する。 */
export function resolveLoginOutcome(response: LoginResponseLike): LoginOutcome {
  if (response.error) {
    if (response.error.code === "email_not_confirmed") {
      return "email_not_confirmed";
    }

    return response.error.code === "invalid_credentials" ||
      response.error.status === 400
      ? "invalid_credentials"
      : "unknown_error";
  }

  return response.hasSession ? "signed_in" : "unknown_error";
}

/**
 * 失敗の理由と、利用者が次に取るべき行動を伝える文言。
 * 内部のエラーコードやSupabaseの原文は含めない。
 */
export const SIGNUP_MESSAGES: Record<Exclude<SignupOutcome, "created">, string> = {
  needs_email_confirmation:
    "確認メールを送信しました。メール内のリンクを開くと登録が完了します。届かない場合は迷惑メールフォルダを確認してください。",
  already_registered:
    "このメールアドレスはすでに登録されています。ログイン画面からお進みください。",
  invalid_credentials:
    "メールアドレスの形式、またはパスワードの条件を満たしていません。パスワードは8文字以上で入力してください。",
  unknown_error:
    "登録に失敗しました。時間をおいて再度お試しください。解消しない場合は通信環境を確認してください。",
};

export const LOGIN_MESSAGES: Record<Exclude<LoginOutcome, "signed_in">, string> = {
  invalid_credentials:
    "メールアドレスまたはパスワードが正しくありません。入力内容を確認してください。",
  email_not_confirmed:
    "メールアドレスの確認が完了していません。確認メール内のリンクを開いてからログインしてください。",
  unknown_error:
    "ログインに失敗しました。時間をおいて再度お試しください。解消しない場合は通信環境を確認してください。",
};

export const LOGIN_REDIRECT_MESSAGES: Record<LoginRedirectReason, string> = {
  session_expired:
    "ログインの有効期限が切れました。お手数ですが、もう一度ログインしてください。",
  login_required: "このページを表示するにはログインが必要です。",
};

/** クエリ文字列から受け取った理由を、想定内の値だけに限定する。 */
export function toLoginRedirectReason(value: string | undefined): LoginRedirectReason | null {
  if (value === "session_expired" || value === "login_required") {
    return value;
  }

  return null;
}
