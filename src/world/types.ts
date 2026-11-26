// Const 데이터 모델 (명세 1)

export type EntityId = string;

/** 설정. 이름은 파일(폴더) 이름에서 와요 */
export interface Entity {
  id: EntityId;
  name: string;
  kind: string;
  /** 폴더도 설정이에요. 폴더면 parent로 상위 폴더를 가리켜요 */
  isFolder?: boolean;
  parent?: EntityId | null;
  /** 설정이 들어 있는 바로 위 폴더. 볼트 맨 위에 있는 문서는 없음 */
  folder?: EntityId;
  /** 등장 연도 */
  s: number;
  /** 퇴장 연도 */
  e: number;
  tags: string[];
  /** 같은 폴더 안에서의 순서(작을수록 위). 없으면 이름 순 */
  order?: number;
}

/** 폴더 팔레트: 대표색, 머리줄 글자, 일반 글자, 선택됨 글자, 줄 바탕, 보조 글자 */
export interface Palette {
  c: string;
  head: string;
  text: string;
  sel: string;
  bg: string;
  muted: string;
}

export interface ConstEvent {
  id: string;
  title: string;
  year: number;
  /** 그 해 안의 위치 0~1 (날짜) */
  at: number;
  /** 같은 날짜일 때 순서 */
  ord: number;
  date: string;
  rows: EntityId[];
  desc: string;
  tags: string[];
}

export interface Era {
  name: string;
  s: number;
  e: number;
}

/** [출발, 대상, 종류 id, 시작, 끝]. 방향은 늘 출발→대상. 끝이 없으면 Infinity */
export type Relation = [EntityId, EntityId, string, number, number];

export interface RelationKind {
  id: string;
  name: string;
  color: string;
  on: boolean;
}

export type ZoneShape = 'circle' | 'rect' | 'free';
export interface ZoneBase {
  cx: number;
  cy: number;
  r: number;
}

/** 한 작품(볼트)의 모든 데이터 */
export interface World {
  entities: Record<EntityId, Entity>;
  /** 설정마다 마크다운 본문 (frontmatter 뺀 부분) */
  docs: Record<EntityId, string>;
  /** 폴더별: 팔레트, 폴더 시대, 관계도 구역 모양 */
  palettes: Record<EntityId, Palette>;
  folderEras: Record<EntityId, Era[]>;
  shapes: Record<EntityId, ZoneShape>;
  events: ConstEvent[];
  relations: Relation[];
  kinds: RelationKind[];
  globalEras: Era[];
  /** 종류별 보기의 그룹 순서 */
  entityKinds: string[];
  /** 작품의 기본 시간 범위 (처음 화면, 관계도 기준 시점) */
  span: { start: number; end: number };
  /** 관계도 노드 키프레임 [연도, x, y]와 폴더 구역 위치 (760×520 영역) */
  layout: { nodes: Record<EntityId, [number, number, number][]>; zones: Record<EntityId, ZoneBase> };
}

export type View = 'grid' | 'graph';
export type GroupBy = 'folder' | 'kind';
export type LineMode = 'faction' | 'kind';
export type AsideTab = 'doc' | 'event';
export type DocMode = 'view' | 'edit';
