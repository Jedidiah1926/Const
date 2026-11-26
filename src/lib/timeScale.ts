// 격자 가로축 (명세 2). view0(왼쪽 끝 연도)와 ppy(1년당 px)로 이동·확대해요
// 달력: 1년 = 12달 × 30일 (작품마다 바꿀 수 있는 값)

export const GRID_LEFT = 240;
export const SIDEBAR_W = 210;
export const MIN_PPY = 0.002;
export const MAX_PPY = 2e6;
export const FIT_FROM = 1196;
export const FIT_YEARS = 48;

export interface Viewport {
  view0: number;
  ppy: number;
  viewW: number;
}

const UNITS: [number, string][] = [
  [1000, '1000년'], [500, '500년'], [200, '200년'], [100, '100년'], [50, '50년'], [20, '20년'], [10, '10년'],
  [5, '5년'], [2, '2년'], [1, '1년'],
  [6 / 12, '6개월'], [3 / 12, '3개월'], [1 / 12, '1개월'],
  [10 / 360, '10일'], [5 / 360, '5일'], [1 / 360, '1일'],
];

/** 눈금 사이 64px 이상인 가장 작은 단위 */
export function pickUnit(ppy: number): [number, string] {
  return UNITS.slice().reverse().find(([u]) => u * ppy >= 64) ?? UNITS[0];
}

export interface Tick {
  x: number;
  label: string;
  major: boolean;
}

export function buildTicks(vp: Viewport, X: (v: number) => number): Tick[] {
  const [u] = pickUnit(vp.ppy);
  const vEnd = vp.view0 + (vp.viewW - GRID_LEFT) / vp.ppy;
  const ticks: Tick[] = [];
  const i0 = Math.floor(vp.view0 / u);
  const i1 = Math.ceil(vEnd / u);
  for (let i = i0; i <= i1 && ticks.length < 400; i++) {
    const v = i * u;
    const day = Math.round(v * 360);
    const yy = Math.floor(day / 360);
    const m = Math.floor((day % 360) / 30) + 1;
    const d = (day % 30) + 1;
    let label: string;
    let major: boolean;
    if (u >= 1) {
      label = String(Math.round(v));
      major = Math.round(v) % (u * 5 >= 10 ? u * 5 : 10) === 0;
    } else if (u >= 1 / 12) {
      major = day % 360 === 0;
      label = major ? yy + '년' : m + '월';
    } else {
      major = day % 30 === 0;
      label = day % 360 === 0 ? yy + '년' : major ? m + '월' : d + '일';
    }
    const x = X(v);
    if (x < 215) continue;
    ticks.push({ x, label, major });
  }
  return ticks;
}

export function zoomAt(vp: Viewport, px: number, k: number): Viewport {
  const at = vp.view0 + (px - GRID_LEFT) / vp.ppy;
  const ppy = Math.max(MIN_PPY, Math.min(MAX_PPY, vp.ppy * k));
  return { ...vp, ppy, view0: at - (px - GRID_LEFT) / ppy };
}

/** 처음 화면: 1196~1244년이 화면 폭에 딱 맞게 */
export function fit(viewW: number): Viewport {
  return { viewW, ppy: (viewW - GRID_LEFT - 20) / FIT_YEARS, view0: FIT_FROM };
}
