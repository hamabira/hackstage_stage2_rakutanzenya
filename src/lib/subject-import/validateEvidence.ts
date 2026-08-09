import type { ExtractedField } from "./types";

/**
 * 照合用にさらに強く正規化する。
 * 表記ゆれで根拠を取りこぼすと、正しい抽出まで ambiguous へ落ちてしまうため、
 * 空白と大文字小文字の差は無視する。
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replaceAll(/\s+/gu, "")
    .toLowerCase();
}

/** evidenceが入力文に実在するかを判定する。 */
export function isEvidenceFound(evidence: string, normalizedInput: string): boolean {
  if (evidence.trim() === "") {
    return false;
  }

  if (normalizedInput.includes(evidence)) {
    return true;
  }

  const matchableEvidence = normalizeForMatch(evidence);
  if (matchableEvidence === "") {
    return false;
  }

  return normalizeForMatch(normalizedInput).includes(matchableEvidence);
}

/**
 * 根拠を確認できない explicit / derived を ambiguous へ降格し、値を捨てる。
 * AIが根拠を捏造した場合に、その値をフォームへ通さないための関門。
 */
export function verifyField<T>(
  field: ExtractedField<T>,
  normalizedInput: string,
): ExtractedField<T> {
  if (field.status !== "explicit" && field.status !== "derived") {
    return field;
  }

  if (field.evidence !== null && isEvidenceFound(field.evidence, normalizedInput)) {
    return field;
  }

  return { value: null, status: "ambiguous", evidence: null };
}
