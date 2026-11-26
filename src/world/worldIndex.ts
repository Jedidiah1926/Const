// World에서 화면이 쓰는 값들을 미리 계산해요: 트리 순서, 그룹, 팔레트, 관계도 위치
import { createContext, useContext } from 'react';
import { clamp01, smoothstep } from '../lib/color';
import { derivePalette, entityPath } from './vaultFormat';
import type { ConstEvent, EntityId, Palette, World, ZoneBase } from './types';

const ROOT_PALETTE: Palette = { c: '#A8987E', head: '#F2E6D0', text: '#D9CBB0', sel: '#FFA41C', bg: '#0C0A08', muted: '#8C7C62' };

export interface Group {
  folder?: EntityId;
  label?: string;
  ids: EntityId[];
}

export interface WorldIndex {
  world: World;
  ids: EntityId[];
  folderOf: (id: EntityId) => EntityId | undefined;
  paletteOf: (id: EntityId) => Palette;
  depthOf: (folder: EntityId) => number;
  pathOf: (id: EntityId) => string;
  idByName: Record<string, EntityId>;
  /** 폴더 트리를 펼친 순서의 폴더들 */
  folderOrder: EntityId[];
  folderGroups: Group[];
  kindGroups: Group[];
  /** 시간 순 사건 */
  events: ConstEvent[];
  tags: string[];
  eraCount: number;
  zones: Record<EntityId, ZoneBase>;
  /** 관계도에서 그 연도의 노드 위치 */
  posAt: (id: EntityId, yr: number) => [number, number];
}

const byOrder = (w: World) => (a: EntityId, b: EntityId) => {
  const A = w.entities[a], B = w.entities[b];
  return (A.order ?? Infinity) - (B.order ?? Infinity) || Number(!!A.isFolder) - Number(!!B.isFolder) || A.name.localeCompare(B.name, 'ko');
};

export function buildIndex(w: World): WorldIndex {
  const E = w.entities;
  const ids = Object.keys(E);
  const cmp = byOrder(w);
  const folderOf = (id: EntityId) => (E[id].isFolder ? id : E[id].folder);
  const paletteOf = (id: EntityId) => {
    const f = folderOf(id);
    return (f && w.palettes[f]) || (f ? derivePalette(ROOT_PALETTE.c) : ROOT_PALETTE);
  };
  const depthOf = (f: EntityId): number => {
    const p = E[f]?.parent;
    return p ? 1 + depthOf(p) : 0;
  };

  // 트리: 폴더마다 자식(설정과 하위 폴더)을 순서대로
  const children: Record<string, EntityId[]> = {};
  ids.forEach((id) => {
    const e = E[id];
    const parent = (e.isFolder ? e.parent : e.folder) ?? '';
    (children[parent] ??= []).push(id);
  });
  Object.values(children).forEach((l) => l.sort(cmp));
  const flatten = (id: EntityId): EntityId[] => [id, ...(E[id].isFolder ? (children[id] ?? []).flatMap(flatten) : [])];

  const roots = children[''] ?? [];
  const folderGroups: Group[] = roots.filter((id) => E[id].isFolder).map((f) => ({ folder: f, ids: flatten(f) }));
  const loose = roots.filter((id) => !E[id].isFolder);
  if (loose.length) folderGroups.push({ ids: loose });
  const treeOrder = folderGroups.flatMap((g) => g.ids);
  const folderOrder = treeOrder.filter((id) => E[id].isFolder);

  const kinds = [...w.entityKinds, ...new Set(ids.map((id) => E[id].kind).filter((k) => !w.entityKinds.includes(k)))];
  const kindGroups: Group[] = kinds
    .map((label) => ({ label, ids: treeOrder.filter((id) => E[id].kind === label) }))
    .filter((g) => g.ids.length);

  const events = w.events
    .filter((e) => e.rows.some((r) => E[r]))
    .map((e) => ({ ...e, rows: e.rows.filter((r) => E[r]) }))
    .sort((a, b) => a.year + a.at - (b.year + b.at) || a.ord - b.ord);

  const tags = [...new Set([...w.events.flatMap((e) => e.tags), ...ids.flatMap((id) => E[id].tags)])].sort((a, b) => a.localeCompare(b, 'ko'));
  const eraCount = w.globalEras.length + Object.values(w.folderEras).reduce((n, l) => n + l.length, 0);

  // 구역: 저장된 위치가 없으면 최상위는 칸에 나눠 놓고, 하위는 상위 구역 안쪽에
  const zones: Record<EntityId, ZoneBase> = {};
  const tops = folderOrder.filter((f) => !E[f].parent);
  folderOrder.forEach((f) => {
    if (w.layout.zones[f]) {
      zones[f] = w.layout.zones[f];
      return;
    }
    const p = E[f].parent;
    if (!p) {
      const i = tops.indexOf(f), cols = Math.min(3, tops.length);
      const rows = Math.ceil(tops.length / cols);
      const cw = 760 / cols, rh = 520 / rows;
      zones[f] = { cx: cw * (i % cols) + cw / 2, cy: rh * Math.floor(i / cols) + rh / 2, r: Math.min(cw, rh) * 0.42 };
    } else {
      const pz = zones[p];
      const sib = (children[p] ?? []).filter((id) => E[id].isFolder);
      const a = (sib.indexOf(f) / Math.max(1, sib.length)) * Math.PI * 2 + 0.8;
      zones[f] = { cx: pz.cx + Math.cos(a) * pz.r * 0.5, cy: pz.cy + Math.sin(a) * pz.r * 0.5, r: pz.r * 0.32 };
    }
  });

  // 노드: 키프레임이 없으면 폴더 구역 안에 고르게
  const fallback: Record<EntityId, [number, number]> = {};
  ids.forEach((id) => {
    const e = E[id];
    if (e.isFolder) {
      const z = zones[id];
      fallback[id] = [z.cx, z.cy - z.r * 0.25];
      return;
    }
    const z = e.folder ? zones[e.folder] : { cx: 380, cy: 260, r: 200 };
    const sib = e.folder ? (children[e.folder] ?? []).filter((s) => !E[s].isFolder) : loose;
    const i = sib.indexOf(id);
    const a = i * 2.4 + 0.5, rr = z.r * (0.45 + 0.1 * (i % 3));
    fallback[id] = [z.cx + Math.cos(a) * rr, z.cy + Math.sin(a) * rr];
  });
  const posAt = (id: EntityId, yr: number): [number, number] => {
    const k = w.layout.nodes[id];
    if (!k?.length) return fallback[id];
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

  return {
    world: w, ids, folderOf, paletteOf, depthOf,
    pathOf: (id) => entityPath(E, id),
    idByName: Object.fromEntries(ids.map((id) => [E[id].name, id])),
    folderOrder, folderGroups, kindGroups, events, tags, eraCount, zones, posAt,
  };
}

export const WorldContext = createContext<WorldIndex | null>(null);

export function useWorld(): WorldIndex {
  const w = useContext(WorldContext);
  if (!w) throw new Error('WorldContext 밖에서 useWorld를 불렀어요');
  return w;
}
