const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** c1 → c2 사이를 t(0~1)만큼 섞은 색 */
export function mix(c1: string, c2: string, t: number): string {
  const p = hex(c1);
  const q = hex(c2);
  return toHex(p.map((v, i) => v + (q[i] - v) * t));
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
