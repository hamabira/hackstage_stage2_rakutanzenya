/** <input type="date"> にそのまま渡せる、ローカル日付の YYYY-MM-DD 文字列を返す。 */
export function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
