// 볼트 파일 형식 (명세 8)
//
//   <볼트>/
//     아르덴 왕국/_아르덴 왕국.md        폴더 자신의 문서 (폴더 = 디렉터리)
//     아르덴 왕국/레아 바스.md           설정 문서. 이름 = 파일 이름
//     아르덴 왕국/그림자 서기국/…         폴더 안의 폴더 = 하위 디렉터리
//     .const/settings.json             관계 종류, 전체 시대, 종류 순서, 시간 범위
//     .const/events.json               사건
//     .const/relations.json            관계
//     .const/layout.json               관계도 노드·구역 위치
//
// 각 .md 맨 위 YAML frontmatter에 설정 데이터(id, kind, start, end, tags, order,
// 폴더는 color, eras, shape)를 둬요. 사람이 읽고 고칠 수 있게 JSON은 들여쓰기해요.
import YAML from 'yaml';
import { mix } from '../lib/color';
import { DEFAULT_ENTITY_KINDS, DEFAULT_KINDS } from './sample';
import type { ConstEvent, Entity, EntityId, Era, Palette, Relation, RelationKind, World, ZoneShape } from './types';
import type { VaultFiles } from '../../shared/ipc';

export const CONST_DIR = '.const';
export const SETTINGS = '.const/settings.json';
export const EVENTS = '.const/events.json';
export const RELATIONS = '.const/relations.json';
export const LAYOUT = '.const/layout.json';
const FORMAT_VERSION = 1;

const TOP_COLORS = ['#FFA41C', '#9DB8C7', '#7FB3A8', '#D98BB0', '#B9A2E8', '#E0896A'];

/** 대표색 하나로 나머지 글자·바탕 색을 만들어요 */
export function derivePalette(c: string): Palette {
  return {
    c,
    head: mix('#F2E6D0', c, 0.12),
    text: mix('#D9CBB0', c, 0.18),
    sel: mix(c, '#FFFFFF', 0.25),
    bg: mix('#0A0806', c, 0.05),
    muted: mix('#8C7C62', c, 0.2),
  };
}

// ── frontmatter ────────────────────────────────────────
export function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { data: {}, body: text };
  let data: unknown;
  try {
    data = YAML.parse(m[1]);
  } catch {
    data = {};
  }
  return { data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {}, body: text.slice(m[0].length) };
}

function joinFrontmatter(data: Record<string, unknown>, body: string): string {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  return '---\n' + YAML.stringify(clean, { lineWidth: 0 }).trimEnd() + '\n---\n' + body;
}

// ── 값 다루기: 파일은 사람이 고칠 수 있으니 무엇이 와도 안전하게 ──
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : typeof v === 'string' ? v.split(/\s+/).filter(Boolean) : []);
const isShape = (v: unknown): v is ZoneShape => v === 'circle' || v === 'rect' || v === 'free';
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

function eraList(v: unknown): Era[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const name = str(o.name), s = num(o.start), e = num(o.end);
    return name && s !== undefined && e !== undefined ? [{ name, s, e }] : [];
  });
}
const eraOut = (l: Era[]) => l.map((e) => ({ name: e.name, start: e.s, end: e.e }));

function parseJson<T>(text: string | undefined): T | undefined {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

export function newId(taken: Set<string>): string {
  let id: string;
  do id = Math.random().toString(36).slice(2, 8);
  while (taken.has(id));
  taken.add(id);
  return id;
}

// ── 경로 ──────────────────────────────────────────────
/** 볼트 안의 상대 경로. 앱의 폴더 = 실제 디렉터리, 폴더 자신의 문서는 '_폴더이름.md' */
export function entityPath(entities: Record<EntityId, Entity>, id: EntityId): string {
  const e = entities[id];
  const chain: string[] = [];
  let f: EntityId | null | undefined = e.isFolder ? id : e.folder;
  while (f && entities[f]) {
    chain.unshift(entities[f].name);
    f = entities[f].parent;
  }
  chain.push(e.isFolder ? '_' + e.name + '.md' : e.name + '.md');
  return chain.join('/');
}

// ── 읽기: 파일들 → World ───────────────────────────────
export interface LoadResult {
  world: World;
  /** 고쳐서 다시 써야 할 파일 (id가 없던 문서, 없던 .const 파일) */
  fixes: VaultFiles;
}

export function loadWorld(files: VaultFiles): LoadResult {
  const fixes: VaultFiles = {};
  const taken = new Set<string>();
  const entities: Record<EntityId, Entity> = {};
  const docs: Record<EntityId, string> = {};
  const palettes: Record<EntityId, Palette> = {};
  const folderEras: Record<EntityId, Era[]> = {};
  const shapes: Record<EntityId, ZoneShape> = {};
  const dirId: Record<string, EntityId> = {};
  const rawColor: Record<EntityId, unknown> = {};

  const mdPaths = Object.keys(files).filter((p) => p.endsWith('.md') && !p.startsWith(CONST_DIR + '/')).sort();
  const parsed = new Map(mdPaths.map((p) => [p, splitFrontmatter(files[p])]));

  // id가 이미 있는 문서를 먼저 예약해서, 새로 만드는 id와 겹치지 않게
  const idOf = new Map<string, EntityId>();
  for (const p of mdPaths) {
    const id = str(parsed.get(p)!.data.id);
    if (id && !taken.has(id)) {
      taken.add(id);
      idOf.set(p, id);
    }
  }

  // 폴더: 문서가 있는 디렉터리마다 하나 (얕은 것부터)
  const dirs = new Set<string>();
  for (const p of mdPaths) {
    const segs = p.split('/');
    for (let i = 1; i < segs.length; i++) dirs.add(segs.slice(0, i).join('/'));
  }
  [...dirs]
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .forEach((dir) => {
      const segs = dir.split('/');
      const name = segs[segs.length - 1];
      const docPath = dir + '/_' + name + '.md';
      const doc = parsed.get(docPath);
      const parentDir = segs.slice(0, -1).join('/');
      const fm = doc?.data ?? {};
      const id = idOf.get(docPath) ?? newId(taken);
      entities[id] = {
        id, name, isFolder: true, parent: parentDir ? dirId[parentDir] : null,
        kind: str(fm.kind) ?? '폴더', s: num(fm.start) ?? NaN, e: num(fm.end) ?? NaN, tags: strList(fm.tags), order: num(fm.order),
      };
      docs[id] = doc?.body ?? '# ' + name + '\n';
      folderEras[id] = eraList(fm.eras);
      if (isShape(fm.shape)) shapes[id] = fm.shape;
      rawColor[id] = fm.color;
      dirId[dir] = id;
      if (!doc || !idOf.has(docPath)) fixes[docPath] = '';
    });

  // 설정 문서
  for (const p of mdPaths) {
    const segs = p.split('/');
    const file = segs[segs.length - 1];
    const dir = segs.slice(0, -1).join('/');
    if (dir && file === '_' + segs[segs.length - 2] + '.md') continue; // 폴더 문서
    const { data: fm, body } = parsed.get(p)!;
    const id = idOf.get(p) ?? newId(taken);
    entities[id] = {
      id, name: file.slice(0, -3), kind: str(fm.kind) ?? '설정', folder: dir ? dirId[dir] : undefined,
      s: num(fm.start) ?? NaN, e: num(fm.end) ?? NaN, tags: strList(fm.tags), order: num(fm.order),
    };
    docs[id] = body;
    if (!idOf.has(p)) fixes[p] = '';
  }

  // 폴더 색: 지정이 없으면 최상위는 돌아가며, 하위는 상위 폴더 계열에서 한 톤 바꾼 색
  let top = 0;
  const folderIds = Object.keys(entities).filter((id) => entities[id].isFolder);
  const depth = (id: EntityId): number => (entities[id].parent ? 1 + depth(entities[id].parent!) : 0);
  folderIds.sort((a, b) => depth(a) - depth(b)).forEach((id) => {
    const c = rawColor[id];
    const parent = entities[id].parent;
    const base = parent ? mix(palettes[parent].c, '#FFFFFF', 0.22) : TOP_COLORS[top++ % TOP_COLORS.length];
    if (isHex(c)) palettes[id] = derivePalette(c);
    else if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>;
      const d = derivePalette(isHex(o.c) ? o.c : base);
      palettes[id] = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, isHex(o[k]) ? o[k] : v])) as unknown as Palette;
    } else palettes[id] = derivePalette(base);
  });

  // .const
  const settings = parseJson<Record<string, unknown>>(files[SETTINGS]) ?? {};
  const kinds: RelationKind[] = Array.isArray(settings.relationKinds)
    ? settings.relationKinds.flatMap((k: Record<string, unknown>) => {
      const id = str(k?.id), name = str(k?.name) ?? id;
      return id && name ? [{ id, name, color: isHex(k.color) ? k.color : '#A8987E', on: k.visible !== false }] : [];
    })
    : DEFAULT_KINDS.map((k) => ({ ...k }));
  const globalEras = eraList(settings.eras);
  const entityKinds = strList(settings.entityKinds);
  const spanO = (settings.span ?? {}) as Record<string, unknown>;

  const events: ConstEvent[] = (parseJson<unknown[]>(files[EVENTS]) ?? []).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const year = num(o.year);
    if (year === undefined) return [];
    const id = str(o.id) ?? newId(taken);
    return [{
      id, year, title: str(o.title) ?? '(제목 없음)', at: Math.max(0, Math.min(0.999, num(o.at) ?? 0)), ord: num(o.order) ?? 0,
      date: str(o.date) ?? '', rows: strList(o.entities).filter((r) => entities[r]), desc: str(o.description) ?? '', tags: strList(o.tags),
    }];
  });

  const relations: Relation[] = (parseJson<unknown[]>(files[RELATIONS]) ?? []).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const a = str(o.from), b = str(o.to), k = str(o.kind), s = num(o.start);
    if (!a || !b || !k || !entities[a] || !entities[b]) return [];
    return [[a, b, k, s ?? -Infinity, num(o.end) ?? Infinity] as Relation];
  });

  const layoutO = parseJson<{ nodes?: Record<string, unknown>; zones?: Record<string, unknown> }>(files[LAYOUT]) ?? {};
  const nodes: World['layout']['nodes'] = {};
  Object.entries(layoutO.nodes ?? {}).forEach(([id, v]) => {
    if (!entities[id] || !Array.isArray(v)) return;
    const keys = v.filter((k): k is [number, number, number] => Array.isArray(k) && k.length === 3 && k.every((n) => typeof n === 'number'));
    if (keys.length) nodes[id] = keys.sort((p, q) => p[0] - q[0]);
  });
  const zones: World['layout']['zones'] = {};
  Object.entries(layoutO.zones ?? {}).forEach(([id, v]) => {
    const o = (v ?? {}) as Record<string, unknown>;
    const cx = num(o.cx), cy = num(o.cy), r = num(o.r);
    if (entities[id]?.isFolder && cx !== undefined && cy !== undefined && r !== undefined) zones[id] = { cx, cy, r };
  });

  // 시간 범위: 지정이 없으면 사건·시대·생애에서
  const years = [
    ...events.map((e) => e.year), ...globalEras.flatMap((e) => [e.s, e.e]),
    ...Object.values(entities).flatMap((e) => [e.s, e.e]),
  ].filter(Number.isFinite);
  const span = {
    start: num(spanO.start) ?? (years.length ? Math.floor(Math.min(...years)) : 0),
    end: num(spanO.end) ?? (years.length ? Math.ceil(Math.max(...years)) : 100),
  };
  if (span.end <= span.start) span.end = span.start + 1;
  // 생애가 없는 설정은 작품 전체 기간에 걸쳐 있어요
  Object.values(entities).forEach((e) => {
    if (!Number.isFinite(e.s)) e.s = span.start;
    if (!Number.isFinite(e.e)) e.e = span.end;
  });

  const world: World = {
    entities, docs, palettes, folderEras, shapes, events, relations, kinds, globalEras,
    entityKinds: entityKinds.length ? entityKinds : [...DEFAULT_ENTITY_KINDS], span, layout: { nodes, zones },
  };

  // 고칠 파일의 본문을 채워요
  for (const p of Object.keys(fixes)) {
    const id = Object.keys(entities).find((i) => entityPath(entities, i) === p);
    if (id) fixes[p] = serializeEntity(world, id);
    else delete fixes[p];
  }
  if (files[SETTINGS] === undefined) fixes[SETTINGS] = serializeSettings(world);
  if (files[EVENTS] === undefined) fixes[EVENTS] = serializeEvents(world);
  if (files[RELATIONS] === undefined) fixes[RELATIONS] = serializeRelations(world);
  if (files[LAYOUT] === undefined) fixes[LAYOUT] = serializeLayout(world);
  return { world, fixes };
}

// ── 쓰기: World → 파일들 ──────────────────────────────
export function serializeEntity(w: World, id: EntityId): string {
  const e = w.entities[id];
  const fm: Record<string, unknown> = {
    id: e.id,
    kind: e.kind,
    start: e.s,
    end: e.e,
    tags: e.tags.length ? e.tags : undefined,
    order: e.order,
  };
  if (e.isFolder) {
    fm.color = w.palettes[id] ? { ...w.palettes[id] } : undefined;
    fm.eras = w.folderEras[id]?.length ? eraOut(w.folderEras[id]) : undefined;
    fm.shape = w.shapes[id];
  }
  return joinFrontmatter(fm, w.docs[id] ?? '');
}

export const serializeSettings = (w: World) =>
  json({
    version: FORMAT_VERSION,
    span: w.span,
    entityKinds: w.entityKinds,
    relationKinds: w.kinds.map((k) => ({ id: k.id, name: k.name, color: k.color, visible: k.on })),
    eras: eraOut(w.globalEras),
  });

export const serializeEvents = (w: World) =>
  json(w.events.map((e) => ({ id: e.id, title: e.title, year: e.year, at: e.at, order: e.ord, date: e.date, entities: e.rows, description: e.desc, tags: e.tags })));

const finiteOrNull = (n: number) => (Number.isFinite(n) ? n : null);
export const serializeRelations = (w: World) =>
  json(w.relations.map(([from, to, kind, s, e]) => ({ from, to, kind, start: finiteOrNull(s), end: finiteOrNull(e) })));

export const serializeLayout = (w: World) => json({ nodes: w.layout.nodes, zones: w.layout.zones });

/** 작품 전체를 파일로 (새 볼트에 예시를 쓸 때) */
export function serializeWorld(w: World): VaultFiles {
  const out: VaultFiles = {};
  Object.keys(w.entities).forEach((id) => {
    out[entityPath(w.entities, id)] = serializeEntity(w, id);
  });
  out[SETTINGS] = serializeSettings(w);
  out[EVENTS] = serializeEvents(w);
  out[RELATIONS] = serializeRelations(w);
  out[LAYOUT] = serializeLayout(w);
  return out;
}
