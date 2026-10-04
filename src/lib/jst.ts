/** JST (UTC+9) ユーティリティ。Vercel サーバーは UTC 動作のため全日付計算でここを使う */

const JST_OFFSET = 9 * 60 * 60 * 1000; // 9時間をms換算

/** UTC の Date を JST に変換（getUTC* メソッドで JST の年月日を取得できる） */
export function toJST(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET);
}

/** JST の月初 00:00:00 に相当する UTC の Date を返す */
export function jstMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1) - JST_OFFSET);
}

/** JST の月末 23:59:59.999 に相当する UTC の Date を返す */
export function jstMonthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1) - JST_OFFSET - 1);
}

/** JST の日の開始 00:00:00 に相当する UTC の Date を返す */
export function jstDayStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - JST_OFFSET);
}

/** JST の日の終了 23:59:59.999 に相当する UTC の Date を返す */
export function jstDayEnd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day + 1) - JST_OFFSET - 1);
}

/** "YYYY-MM-DD" 文字列を JST 日付として解釈し、JST 日の開始 UTC を返す */
export function parseDateJST(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return jstDayStart(y, m, d);
}

/** "YYYY-MM-DD" 文字列を JST 日付として解釈し、JST 日の終了 UTC を返す */
export function parseDateEndJST(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return jstDayEnd(y, m, d);
}

/** UTC の Date から JST の "YYYY-MM" キーを生成 */
export function toJSTMonthKey(date: Date): string {
  const jst = toJST(date);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** UTC の Date から JST の "YYYY-MM-DD" キーを生成 */
export function toJSTDayKey(date: Date): string {
  const jst = toJST(date);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

/** 現在の JST 年・月・日を返す */
export function nowJST(): { year: number; month: number; day: number } {
  const jst = toJST(new Date());
  return {
    year:  jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day:   jst.getUTCDate(),
  };
}
