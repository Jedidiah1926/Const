// 달력 (명세 2): 기본 1년 = 12달 × 30일. 사건의 at(그 해 안의 위치 0~1) ⇄ 월·일
export const MONTHS = 12;
export const DAYS = 30;
const YEAR_DAYS = MONTHS * DAYS;

export function monthDayOf(at: number): { m: number; d: number } {
  const day = Math.min(YEAR_DAYS - 1, Math.max(0, Math.round(at * YEAR_DAYS)));
  return { m: Math.floor(day / DAYS) + 1, d: (day % DAYS) + 1 };
}

export function atOf(m: number, d: number): number {
  return ((m - 1) * DAYS + (d - 1)) / YEAR_DAYS;
}

export const dateLabel = (m: number, d: number) => `${m}월 ${d}일`;

/** 끝 없는 관계·시작 없는 관계를 입력칸에서는 빈칸으로 */
export const yearText = (v: number) => (Number.isFinite(v) ? String(v) : '');
