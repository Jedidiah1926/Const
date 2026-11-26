// 관계도 화면 (명세 5·6)
import type { CSSProperties } from 'react';
import { ENTITIES, EVENTS, FOLDER_ORDER, GRAPH_KEYS, PALETTES, RELATIONS, ZONE_BASE } from '../data/sample';
import type { ConstEvent, EntityId, LineMode, RelationKind, ZoneShape } from '../data/types';
import { clamp01, mix, smoothstep } from '../lib/color';
import { depthOf, paletteOf } from '../lib/entities';

const YR_MIN = 1200;
const YR_MAX = 1240;
const TRACK_H = 320;
const AMBER = '#FFA41C';
const NEW_KIND_COLORS = ['#4FC3F7', '#F06292', '#FFD54F', '#90A4AE'];

interface Props {
  yr: number;
  onYear: (yr: number, eventId?: string) => void;
  currentEvent: ConstEvent;
  kinds: RelationKind[];
  setKinds: (k: RelationKind[]) => void;
  lineMode: LineMode;
  onLineMode: (m: LineMode) => void;
  shapes: Record<EntityId, ZoneShape>;
  onShape: (f: EntityId, s: ZoneShape) => void;
}

export function GraphView(p: Props) {
  return (
    <div className="graph-wrap">
      <GraphSide {...p} />
      <div className="graph-area">
        <div className="graph-year">
          <span className="graph-year-num">{Math.floor(p.yr)}</span>
          <span className="graph-year-cap">년의 관계</span>
        </div>
        <GraphStage yr={p.yr} kinds={p.kinds} lineMode={p.lineMode} shapes={p.shapes} />
      </div>
    </div>
  );
}

// ── 왼쪽 패널: 기준 시점 / 관계 종류 / 구역 모양 ──
function GraphSide({ yr, onYear, currentEvent, kinds, setKinds, lineMode, onLineMode, shapes, onShape }: Props) {
  const T = (v: number) => 10 + ((v - YR_MIN) / (YR_MAX - YR_MIN)) * TRACK_H;
  const marks = [...new Set(EVENTS.map((e) => Math.floor(e.year)))].map((v) => {
    const list = EVENTS.filter((e) => Math.floor(e.year) === v).sort((a, b) => a.ord - b.ord);
    const past = v <= yr;
    const cur = Math.floor(currentEvent.year) === v;
    return { v, list, past, cur };
  });
  const setKind = (id: string, patch: Partial<RelationKind>) => setKinds(kinds.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  const addKind = () => {
    const n = kinds.length - 2;
    setKinds([...kinds, { id: 'k' + Date.now(), name: '새 관계 ' + n, color: NEW_KIND_COLORS[(n - 1) % NEW_KIND_COLORS.length], on: true }]);
  };
  const shapeOpts: [ZoneShape, string, string][] = [
    ['circle', '원', '50%'],
    ['rect', '직사각형', '1px'],
    ['free', '자유형', '60% 40% 55% 45% / 50% 60% 40% 50%'],
  ];

  return (
    <div className="graph-side">
      <div className="side-section">
        <span className="side-title">기준 시점</span>
        <div className="timeline">
          <span className="timeline-track" />
          <span className="timeline-fill" style={{ height: T(yr) - 10 }} />
          {marks.map((m) => (
            <span key={m.v}>
              <span className="timeline-tick" style={{ top: T(m.v) - 1, background: m.past ? AMBER : 'var(--line-strong)' }} />
              <button
                type="button"
                className="timeline-mark"
                style={{ top: T(m.v), color: m.cur ? AMBER : m.past ? 'var(--text-2)' : 'var(--text-faint)', fontWeight: m.cur ? 700 : undefined }}
                onClick={() => onYear(m.v, m.list[0].id)}
              >
                <span className="num">{m.v}</span>
                <span>{m.list[0].title + (m.list.length > 1 ? ' 외 ' + (m.list.length - 1) : '')}</span>
              </button>
            </span>
          ))}
          <span className="timeline-knob" style={{ top: T(yr) - 9 }} />
          <input
            type="range"
            className="yr-range"
            aria-label="기준 연도"
            min={YR_MIN}
            max={YR_MAX}
            step={0.1}
            value={yr}
            onChange={(e) => onYear(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="side-section">
        <span className="side-title">관계 종류</span>
        {kinds.map((k) => (
          <div key={k.id} className="kind-row">
            <input type="checkbox" aria-label={k.name + ' 보이기'} checked={k.on} onChange={() => setKind(k.id, { on: !k.on })} />
            <input type="color" className="kind-color" aria-label={k.name + ' 색'} value={k.color} onChange={(e) => setKind(k.id, { color: e.target.value })} />
            <input type="text" className="kind-name" aria-label="관계 이름" value={k.name} onChange={(e) => setKind(k.id, { name: e.target.value })} />
          </div>
        ))}
        <button type="button" className="add-kind" onClick={addKind}>+ 관계 종류 추가</button>
        <div className="line-mode">
          <span className="tb-label">선 색</span>
          <button type="button" className="u-toggle" aria-pressed={lineMode === 'faction'} onClick={() => onLineMode('faction')}>폴더</button>
          <button type="button" className="u-toggle" aria-pressed={lineMode === 'kind'} onClick={() => onLineMode('kind')}>관계</button>
        </div>
      </div>

      <div className="side-section" style={{ gap: 8 }}>
        <span className="side-title">구역 모양</span>
        {FOLDER_ORDER.map((f) => (
          <div key={f} className="shape-row">
            <span className="shape-name" style={{ color: PALETTES[f].text }}>{(depthOf(f) ? '└ ' : '') + ENTITIES[f].name}</span>
            {shapeOpts.map(([v, label, radius]) => {
              const on = shapes[f] === v;
              return (
                <button
                  key={v}
                  type="button"
                  className="shape-btn"
                  aria-label={ENTITIES[f].name + ' 구역 ' + label}
                  aria-pressed={on}
                  style={on ? { color: PALETTES[f].c, borderColor: PALETTES[f].c } : undefined}
                  onClick={() => onShape(f, v)}
                >
                  <span className="shape-glyph" style={{ borderRadius: radius }} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 그래프 ──
type Pt = [number, number];
interface Zone {
  f: EntityId;
  shape: ZoneShape;
  depth: number;
  cx: number;
  cy: number;
  r: number;
  pts?: Pt[];
  contains: (x: number, y: number) => boolean;
}

/** 자유형 구역: 제어점 8개 (실제 앱에서는 점을 끌어 모양을 고쳐요) */
function blob(z: { cx: number; cy: number; r: number }): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = z.r * (1 + 0.13 * Math.sin(i * 2.3 + 0.7) + 0.07 * Math.cos(i * 3.1));
    pts.push([z.cx + rr * Math.cos(a), z.cy + rr * Math.sin(a) * 0.92]);
  }
  return pts;
}

/** Catmull-Rom → 베지어로 이은 닫힌 곡선 */
function pathOf(pts: Pt[]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + c1.map(f).join(' ') + ' ' + c2.map(f).join(' ') + ' ' + p2.map(f).join(' ');
  }
  return d + 'Z';
}

function inPoly(x: number, y: number, pts: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const nodeR = (id: EntityId) => (ENTITIES[id].isFolder ? (ENTITIES[id].parent ? 8 : 10) : 6);

function GraphStage({ yr, kinds, lineMode, shapes }: { yr: number; kinds: RelationKind[]; lineMode: LineMode; shapes: Record<EntityId, ZoneShape> }) {
  // 노드 위치: 연도별 키프레임을 smoothstep 보간
  const posAt = (id: EntityId): Pt => {
    const k = GRAPH_KEYS[id];
    if (yr <= k[0][0]) return [k[0][1], k[0][2]];
    for (let i = 0; i < k.length - 1; i++) {
      const [t0, x0, y0] = k[i], [t1, x1, y1] = k[i + 1];
      if (yr <= t1) {
        const t = smoothstep(clamp01((yr - t0) / (t1 - t0)));
        return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
      }
    }
    const l = k[k.length - 1];
    return [l[1], l[2]];
  };
  const pos: Record<EntityId, Pt> = {};
  Object.keys(GRAPH_KEYS).forEach((id) => {
    const [x, y] = posAt(id);
    pos[id] = [Math.round(x), Math.round(y)];
  });

  const zones: Zone[] = FOLDER_ORDER.map((f) => {
    const z = ZONE_BASE[f];
    const shape = shapes[f];
    const pts = shape === 'free' ? blob(z) : undefined;
    return {
      f, shape, depth: depthOf(f), ...z, pts,
      contains: (x, y) =>
        shape === 'circle' ? Math.hypot(x - z.cx, y - z.cy) <= z.r
          : shape === 'rect' ? Math.abs(x - z.cx) <= z.r * 0.92 && Math.abs(y - z.cy) <= z.r * 0.78
            : inPoly(x, y, pts!),
    };
  });
  // 여러 구역에 걸치면 가장 깊은(안쪽) 폴더
  const zoneAt = (x: number, y: number) => zones.filter((z) => z.contains(x, y)).sort((a, b) => b.depth - a.depth)[0] ?? null;

  // 한 방향에는 한 시점에 관계 하나만 활성 (시작 ≤ 연도 < 끝)
  const kindMap = Object.fromEntries(kinds.map((k) => [k.id, k]));
  const dirRel: Record<string, { a: EntityId; b: EntityId; k: string }> = {};
  RELATIONS.forEach(([a, b, k, from, to]) => {
    if (yr >= from && yr < to && kindMap[k]?.on) dirRel[a + '>' + b] = { a, b, k };
  });
  const pairs: Record<string, { a: EntityId; b: EntityId; k: string }[]> = {};
  Object.values(dirRel).forEach((r) => {
    const key = [r.a, r.b].sort().join('|');
    (pairs[key] ??= []).push(r);
  });
  const draw: { a: EntityId; b: EntityId; k: string; both: boolean; twin: boolean }[] = [];
  Object.values(pairs).forEach((list) => {
    if (list.length === 2 && list[0].k === list[1].k) draw.push({ ...list[0], both: true, twin: false });
    else list.forEach((r) => draw.push({ ...r, both: false, twin: list.length === 2 }));
  });

  const edges: CSSProperties[] = [];
  const arrows: CSSProperties[] = [];
  const labels: { text: string; style: CSSProperties }[] = [];
  draw.forEach(({ a, b, k, both, twin }) => {
    const kd = kindMap[k];
    let [x1, y1] = pos[a];
    const [x2, y2] = pos[b];
    const dx = x2 - x1, dy = y2 - y1, full = Math.hypot(dx, dy), ux = dx / full, uy = dy / full;
    // 두 방향이 모두 있으면 진행 방향 왼쪽으로 5px씩 벌려 나란히
    const off = twin ? 5 : 0;
    x1 += -uy * off;
    y1 += ux * off;
    const s0 = nodeR(a) + 3;
    const s1 = nodeR(b) + (both ? 3 : 12);
    x1 += ux * s0;
    y1 += uy * s0;
    const len = full - s0 - s1;
    const folderPair = ENTITIES[a].isFolder && ENTITIES[b].isFolder;
    let fill: string;
    let endCol: string;
    if (lineMode === 'kind' || folderPair) {
      fill = kd.color;
      endCol = kd.color;
    } else {
      // 폴더 모드: 선을 따라 5px 간격으로 구역 확인, 빈 곳은 앞뒤 구역색 보간
      const N = Math.max(16, Math.round(len / 5));
      const zk: (EntityId | null)[] = [];
      for (let i = 0; i <= N; i++) {
        const z = zoneAt(x1 + (ux * len * i) / N, y1 + (uy * len * i) / N);
        zk.push(z ? z.f : null);
      }
      const baseAt = (i: number) => {
        if (zk[i]) return PALETTES[zk[i]!].c;
        let lo = i, hi = i;
        while (lo > 0 && !zk[lo]) lo--;
        while (hi < N && !zk[hi]) hi++;
        const cp = zk[lo] ? PALETTES[zk[lo]!].c : null;
        const cq = zk[hi] ? PALETTES[zk[hi]!].c : null;
        if (cp && cq) return mix(cp, cq, (i - lo) / (hi - lo));
        return cp || cq || paletteOf(a).c;
      };
      // 라벨 근처에서만 바탕색 → 관계색 → 바탕색
      const lc = len * (both ? 0.5 : 0.42), half = kd.name.length * 6.5 + 10, fade = 26;
      const stops: string[] = [];
      for (let i = 0; i <= N; i++) {
        const x = (len * i) / N, d = Math.abs(x - lc);
        const w = d <= half ? 1 : d >= half + fade ? 0 : 1 - (d - half) / fade;
        stops.push(mix(baseAt(i), kd.color, w) + ' ' + x.toFixed(1) + 'px');
      }
      fill = 'linear-gradient(to right, ' + stops.join(', ') + ')';
      endCol = stops[stops.length - 1].split(' ')[0];
    }
    const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
    edges.push({ left: x1, top: y1 - 1, width: Math.round(len), background: fill, transform: `rotate(${ang.toFixed(1)}deg)` });
    if (!both) {
      arrows.push({ left: x1 + ux * len, top: y1 + uy * len - 4.5, borderLeftColor: endCol, transform: `rotate(${ang.toFixed(1)}deg)` });
    }
    const lp = len * (both ? 0.5 : 0.42);
    labels.push({ text: kd.name, style: { left: Math.round(x1 + ux * lp), top: Math.round(y1 + uy * lp), color: kd.color } });
  });

  return (
    <div className="graph-stage" role="img" aria-label="설정 관계도">
      {zones.map((z) => {
        const pal = PALETTES[z.f];
        const tint = pal.c + (z.depth ? '10' : '0A');
        const line = pal.c + '40';
        const labelColor = pal.muted;
        if (z.shape === 'free') {
          const top = Math.min(...z.pts!.map((q) => q[1])) - 22;
          return (
            <span key={z.f}>
              <svg className="zone-svg" width="760" height="520" viewBox="0 0 760 520" aria-hidden="true">
                <path d={pathOf(z.pts!)} fill={tint} stroke={line} strokeWidth="1" />
              </svg>
              <span className="zone-label" style={{ left: z.cx, top: Math.round(top), color: labelColor }}>{ENTITIES[z.f].name}</span>
            </span>
          );
        }
        const w = z.shape === 'circle' ? 2 * z.r : 2 * z.r * 0.92;
        const h = z.shape === 'circle' ? 2 * z.r : 2 * z.r * 0.78;
        return (
          <span key={z.f}>
            <span
              className="zone-box"
              style={{ left: z.cx - w / 2, top: z.cy - h / 2, width: w, height: h, background: tint, border: '1px solid ' + line, borderRadius: z.shape === 'circle' ? '50%' : 6 }}
            />
            <span className="zone-label" style={{ left: z.cx, top: z.cy - h / 2 - 20, color: labelColor }}>{ENTITIES[z.f].name}</span>
          </span>
        );
      })}
      {edges.map((s, i) => <span key={'e' + i} className="edge" style={s} />)}
      {arrows.map((s, i) => <span key={'a' + i} className="arrow" style={s} />)}
      {labels.map((l, i) => <span key={'l' + i} className="edge-label" style={l.style}>{l.text}</span>)}
      {Object.keys(ENTITIES).map((id) => {
        const r = ENTITIES[id];
        const [x, y] = pos[id];
        // 등장/퇴장 ±0.5년 페이드
        const av = clamp01(yr - r.s + 0.5) * clamp01(r.e - yr + 0.5);
        const alive = av > 0.5;
        const s = nodeR(id) * 2;
        const pal = paletteOf(id);
        return (
          <span key={id}>
            <span
              className="g-node"
              style={{
                left: x - s / 2, top: y - s / 2, width: s, height: s, opacity: 0.35 + 0.65 * av,
                ...(alive ? { background: pal.c } : { border: '1.5px solid ' + pal.c + '88' }),
              }}
            />
            <span
              className="g-node-label"
              style={{
                left: x, top: y + s / 2 + 6,
                color: alive ? (r.isFolder ? pal.head : pal.text) : 'var(--text-faint)',
                fontWeight: alive && r.isFolder ? 700 : undefined,
              }}
            >
              {r.name + (alive ? '' : ' (부재)')}
            </span>
          </span>
        );
      })}
    </div>
  );
}
