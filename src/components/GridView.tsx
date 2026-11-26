// 격자 화면 (명세 2·3·4): 가로축 = 시간, 세로축 = 설정 목록
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { buildTicks, fit, GRID_LEFT, zoomAt } from '../lib/timeScale';
import type { Viewport } from '../lib/timeScale';
import type { ConstEvent, EntityId, GroupBy } from '../world/types';
import { useWorld } from '../world/worldIndex';
import type { WorldIndex } from '../world/worldIndex';

interface Props {
  vp: Viewport;
  setVp: (fn: (vp: Viewport) => Viewport) => void;
  fitted: boolean;
  onFitted: () => void;
  groupBy: GroupBy;
  showEra: boolean;
  selected: ConstEvent | undefined;
  onPickEvent: (ev: ConstEvent) => void;
  onOpenDoc: (id: EntityId) => void;
}

const ROW_H = 50;

export function GridView({ vp, setVp, fitted, onFitted, groupBy, showEra, selected, onPickEvent, onOpenDoc }: Props) {
  const ix = useWorld();
  const span = ix.world.span;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const vpRef = useRef(vp);
  vpRef.current = vp;

  // 확대/이동: 핀치(트랙패드)와 Ctrl/⌘+휠은 커서 기준 확대, 가로 휠·Shift+휠·끌기는 좌우 이동
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (!w) return;
      if (!fitted) {
        setVp(() => fit(w, span));
        onFitted();
      } else setVp((v) => (Math.abs(w - v.viewW) > 1 ? { ...v, viewW: w } : v));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();

    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setVp((v) => zoomAt(v, e.clientX - r.left, Math.exp(-e.deltaY * 0.01)));
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        const d = e.shiftKey ? e.deltaY : e.deltaX;
        setVp((v) => ({ ...v, view0: v.view0 + d / v.ppy }));
      }
    };
    let drag: { x: number; v: number } | null = null;
    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.button !== 0 || e.clientX - r.left < 212 || (e.target as Element).closest('button,input,textarea')) return;
      drag = { x: e.clientX, v: vpRef.current.view0 };
      el.setPointerCapture(e.pointerId);
      setDragging(true);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const d = drag;
      setVp((v) => ({ ...v, view0: d.v - (e.clientX - d.x) / v.ppy }));
    };
    const onEnd = () => {
      drag = null;
      setDragging(false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onEnd);
      el.removeEventListener('pointercancel', onEnd);
    };
  }, [fitted, onFitted, setVp, span]);

  const L = useMemo(() => layout(ix, vp, groupBy, showEra, selected, setVp), [ix, vp, groupBy, showEra, selected, setVp]);

  return (
    <div ref={scrollRef} className={'grid-scroll' + (dragging ? ' dragging' : '')}>
      <div className="grid-canvas" style={{ height: L.gridH }}>
        {L.ticks.map((t, i) => (
          <span key={'t' + i}>
            <span className={'tick-label num' + (t.major ? ' major' : '')} style={{ left: t.x }}>{t.label}</span>
            <span className={'tick-line' + (t.major ? ' major' : '')} style={{ left: t.x }} />
          </span>
        ))}

        {showEra && (
          <>
            {L.eras.map((e) => (
              <span key={e.name}>
                <span className="era-line" style={{ ...e.line, top: 30, background: 'var(--era)' }} />
                <span className="era-name" style={{ ...e.label, top: 33, color: 'var(--era)' }}>{e.name}</span>
              </span>
            ))}
            {L.folderEras.map((e) => (
              <span key={e.key}>
                <span className="era-line" style={e.line} />
                <span className="era-name" style={e.label}>{e.name}</span>
                <span className="abs" style={e.band} />
              </span>
            ))}
          </>
        )}

        {L.yearChips.map((y) => (
          <button key={y.year} type="button" className={'year-chip num' + (y.multi ? ' multi' : '')} style={{ left: y.x }} onClick={y.pick}>
            {y.label}
          </button>
        ))}
        {L.groups.map((g, i) => (
          <span key={'g' + i} className="group-line" style={{ top: g.top }} />
        ))}

        <div className="sidebar" style={{ height: L.gridH }}>
          <span className="sidebar-bg" />
          <span className="sidebar-edge" />
          {showEra && <span className="sidebar-era">전체 시대</span>}
          {L.rowBgs.map((b, i) => (
            <span key={'b' + i} className="row-bg" style={b} />
          ))}
          {L.groups.map((g, i) => (
            <span key={'gl' + i}>
              <span className="row-bg" style={{ top: g.top, height: 1, background: 'var(--line)' }} />
              {g.label && (
                <div className="kind-label-box" style={{ top: g.top, height: g.height }}>
                  <span className="kind-label">{g.label}</span>
                </div>
              )}
            </span>
          ))}
          {L.bars.map((b, i) => (
            <span key={'bar' + i} className="folder-bar" style={b} />
          ))}
          {L.eraRows.map((r) => (
            <span key={r.name} className="row-era" style={{ top: r.top, color: r.color }}>{r.name}</span>
          ))}
          {L.rows.map((r) => (
            <div key={r.id} className="row" style={{ top: r.top, left: r.left, width: 210 - r.left }}>
              <button type="button" className="row-name" style={r.nameStyle} onClick={() => onOpenDoc(r.id)}>{r.name}</button>
              <span className="row-kind" style={{ color: r.mutedColor }}>{r.kind}</span>
            </div>
          ))}
        </div>

        {L.life.map((d, i) => (
          <span key={'l' + i} className="life" style={d} />
        ))}
        {L.connectors.map((c, i) => (
          <span key={'c' + i} className={'connector' + (c.dashed ? ' dashed' : '')} style={c.style} />
        ))}
        {L.nodes.map((n, i) => (
          <span key={'n' + i} className="ev-node" style={n} />
        ))}
        {L.events.map((ev) => (
          <button key={ev.ev.id} type="button" className="ev-title" style={ev.style} onClick={() => onPickEvent(ev.ev)}>{ev.title}</button>
        ))}
      </div>
    </div>
  );
}

function layout(ix: WorldIndex, vp: Viewport, groupBy: GroupBy, showEra: boolean, selected: ConstEvent | undefined, setVp: Props['setVp']) {
  const { world: w, folderOf, paletteOf, depthOf } = ix;
  const ENTITIES = w.entities;
  const PALETTES = w.palettes;
  const EVENTS = ix.events;
  const { ppy, viewW: vw } = vp;
  const X = (v: number) => GRID_LEFT + (v - vp.view0) * ppy;
  // 화면 밖은 그리지 않고, 생애선·시대 띠는 화면 경계에서 잘라요
  const cX = (x: number) => Math.max(205, Math.min(vw + 20, x));
  const offscreen = (s: number, e: number) => X(e) < 215 || X(s) > vw;

  const ticks = buildTicks(vp, X);

  // 사건 x = 실제 날짜 위치. 16px 안에 겹치면 18px씩 옆으로 비켜 세워요(이 비켜섬은 시간이 아님)
  const evTime = (e: ConstEvent) => e.year + e.at;
  const evX: Record<string, number> = {};
  let lastX = -1e12;
  let stack = 0;
  EVENTS.slice()
    .sort((a, b) => evTime(a) - evTime(b) || a.ord - b.ord)
    .forEach((e) => {
      const raw = X(evTime(e));
      stack = raw - lastX < 16 ? stack + 1 : 0;
      evX[e.id] = raw + stack * 18;
      if (!stack) lastX = raw;
    });

  // ── 왼쪽 바와 줄 ──
  const groupsSpec = groupBy === 'folder' ? ix.folderGroups : ix.kindGroups;
  let y = 80;
  let idx = 0;
  const groups: { top: number; height: number; label: string }[] = [];
  const rows: { id: EntityId; name: string; kind: string; top: number; left: number; nameStyle: CSSProperties; mutedColor: string }[] = [];
  const eraRows: { name: string; top: number; color: string }[] = [];
  const rowBgs: CSSProperties[] = [];
  const life: CSSProperties[] = [];
  const folderEras: { key: string; name: string; line: CSSProperties; label: CSSProperties; band: CSSProperties }[] = [];
  const cy: Record<EntityId, number> = {};
  const order: Record<EntityId, number> = {};
  const rowTop: Record<EntityId, number> = {};
  const orderList: EntityId[] = [];

  groupsSpec.forEach((g) => {
    const top = y;
    const fe = showEra && g.folder ? w.folderEras[g.folder] ?? [] : [];
    if (fe.length && g.folder) {
      const p = PALETTES[g.folder];
      rowBgs.push({ top: y, height: 24, background: p.bg });
      eraRows.push({ name: ENTITIES[g.folder].name + ' 시대', top: y - 13, color: p.muted });
      y += 24;
    }
    g.ids.forEach((id) => {
      const r = ENTITIES[id];
      const p = paletteOf(id);
      const isHead = groupBy === 'folder' && !!r.isFolder;
      const depth = groupBy === 'folder' ? (r.isFolder ? depthOf(id) : r.folder ? depthOf(r.folder) + 1 : 0) : 0;
      const inSel = !!selected?.rows.includes(id);
      const left = groupBy === 'folder' ? 20 + depth * 16 : 44;
      rowBgs.push({ top: y, height: ROW_H, background: p.bg });
      const kind =
        groupBy === 'folder'
          ? isHead ? (depth ? r.kind : '') : r.kind
          : ENTITIES[(r.isFolder ? r.parent : r.folder) ?? '']?.name ?? '';
      rows.push({
        id, name: r.name, kind, top: y, left, mutedColor: p.muted,
        nameStyle: { color: inSel ? p.sel : r.isFolder ? p.head : p.text, fontWeight: r.isFolder ? 700 : 500 },
      });
      cy[id] = y + ROW_H / 2;
      rowTop[id] = y;
      orderList.push(id);
      order[id] = idx++;
      // 생애선: 일반 1px(폴더색 27%), 폴더 줄 2px(폴더색 47%)
      life.push({
        left: cX(X(r.s)), width: Math.max(0, cX(X(r.e)) - cX(X(r.s))), top: y + ROW_H / 2,
        ...(r.isFolder ? { height: 2, background: p.c + '77' } : { background: p.c + '44' }),
      });
      y += ROW_H;
    });
    if (fe.length && g.folder) {
      const p = PALETTES[g.folder];
      fe.forEach((e, i) => {
        folderEras.push({
          key: g.folder + e.name,
          name: e.name,
          line: { left: cX(X(e.s)), width: Math.max(0, cX(X(e.e)) - cX(X(e.s)) - 6), top: top + 6, background: p.c + 'AA' },
          label: { left: cX(X(e.s)), top: top + 8, color: p.text, display: offscreen(e.s, e.e) ? 'none' : undefined },
          band: { left: cX(X(e.s)), width: Math.max(0, cX(X(e.e)) - cX(X(e.s))), top, height: y - top, background: i % 2 ? p.c + '08' : 'transparent' },
        });
      });
    }
    groups.push({ top, height: y - top, label: g.label ?? '' });
    y += 12;
  });
  const gridH = y + 12;

  // 폴더 막대: 폴더 줄 바로 아래 줄부터 마지막 후손 줄까지. 하위 폴더 막대는 안쪽에 나란히
  const bars: CSSProperties[] = [];
  if (groupBy === 'folder') {
    ix.folderOrder.forEach((f) => {
      const desc = orderList.filter((id) => {
        const of = folderOf(id);
        return id !== f && !!of && (of === f || ENTITIES[of].parent === f);
      });
      if (!desc.length) return;
      const t0 = Math.min(...desc.map((id) => rowTop[id]));
      const t1 = Math.max(...desc.map((id) => rowTop[id])) + ROW_H;
      bars.push({ left: 14 + depthOf(f) * 16, top: t0 + 10, height: t1 - t0 - 20, background: PALETTES[f].c });
    });
  }

  const eras = w.globalEras.map((e) => ({
    name: e.name,
    line: { left: cX(X(e.s)), width: Math.max(0, cX(X(e.e)) - cX(X(e.s)) - 6) } as CSSProperties,
    label: { left: cX(X(e.s)), display: offscreen(e.s, e.e) ? 'none' : undefined } as CSSProperties,
  }));

  // 연도 칩: 사건이 있는 해마다 하나. 누르면 그 해가 화면 폭을 채우도록 확대
  const years = [...new Set(EVENTS.map((e) => e.year))];
  const yearChips = years
    .filter((v) => X(v + 0.5) > 225 && X(v + 0.5) < vw)
    .map((v) => {
      const n = EVENTS.filter((e) => e.year === v).length;
      return {
        year: v, x: Math.round(X(v + 0.5)), multi: n > 1, label: v + (n > 1 ? ' · ' + n : ''),
        pick: () => setVp((p) => ({ ...p, ppy: (p.viewW - GRID_LEFT - 40) / 1.1, view0: v - 0.05 })),
      };
    });

  // ── 사건 노드와 세로선 ──
  const connectors: { style: CSSProperties; dashed: boolean }[] = [];
  const nodes: CSSProperties[] = [];
  const events: { ev: ConstEvent; title: string; style: CSSProperties }[] = [];
  EVENTS.forEach((ev) => {
    const on = ev.id === selected?.id;
    const top = Math.min(...ev.rows.map((r) => cy[r]));
    const x = evX[ev.id];
    if (x < 215 || x > vw + 20) return;
    const lineCol = (id: EntityId) => paletteOf(id).c + (on ? '' : '99');
    const sorted = ev.rows.slice().sort((a, b) => order[a] - order[b]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const y0 = cy[a] + 6;
      const y1 = cy[b] - 6;
      let fill: string;
      if (groupBy === 'kind') {
        // 종류별: 양 끝 노드 색만
        fill = lineCol(a) === lineCol(b) ? lineCol(a) : `linear-gradient(to bottom, ${lineCol(a)}, ${lineCol(b)})`;
      } else {
        // 폴더별: 지나가는 각 줄 구간을 그 줄의 폴더색으로, 경계에서만 그라데이션
        const stops: string[] = [];
        for (let k = order[a]; k <= order[b]; k++) {
          const id = orderList[k];
          const c = lineCol(id);
          const st = Math.max(rowTop[id] + 6, y0) - y0;
          const en = Math.min(rowTop[id] + 44, y1) - y0;
          if (en > st) stops.push(`${c} ${st}px`, `${c} ${en}px`);
        }
        const uniq = new Set(stops.map((t) => t.split(' ')[0]));
        fill = uniq.size <= 1 ? lineCol(a) : `linear-gradient(to bottom, ${stops.join(', ')})`;
      }
      connectors.push({ style: { left: x, top: y0, height: y1 - y0, background: fill }, dashed: order[b] - order[a] !== 1 });
    }
    ev.rows.forEach((id) => {
      const c = paletteOf(id).c;
      const s = on ? 11 : 9;
      nodes.push({
        left: x - s / 2 + 0.5, top: cy[id] - s / 2, width: s, height: s,
        background: on ? c : 'var(--bg)', border: `1.5px solid ${on ? c : c + 'CC'}`,
        boxShadow: on ? `0 0 10px ${c}99` : undefined,
      });
    });
    const tp = paletteOf(sorted[0]);
    events.push({
      ev,
      title: ev.title + (ppy >= 300 ? ' · ' + ev.date : ''),
      style: { left: x + 6, top: top - 30, color: on ? tp.sel : tp.text, fontWeight: on ? 700 : undefined },
    });
  });

  return { gridH, ticks, eras, folderEras, yearChips, groups, rowBgs, bars, eraRows, rows, life, connectors, nodes, events };
}
