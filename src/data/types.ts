// Const 데이터 모델 (명세 1)

export type EntityId = string;

export interface Entity {
  name: string;
  kind: string;
  /** 폴더도 설정이에요. 폴더면 parent로 상위 폴더를 가리켜요 */
  isFolder?: boolean;
  parent?: EntityId | null;
  /** 설정이 들어 있는 바로 위 폴더 */
  folder?: EntityId;
  /** 등장 연도 */
  s: number;
  /** 퇴장 연도 */
  e: number;
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
  tags: string;
}

export interface Era {
  name: string;
  s: number;
  e: number;
}

/** [출발, 대상, 종류 id, 시작, 끝]. 방향은 늘 출발→대상 */
export type Relation = [EntityId, EntityId, string, number, number];

export interface RelationKind {
  id: string;
  name: string;
  color: string;
  on: boolean;
}

export type ZoneShape = 'circle' | 'rect' | 'free';

export type View = 'grid' | 'graph';
export type GroupBy = 'folder' | 'kind';
export type LineMode = 'faction' | 'kind';
export type AsideTab = 'doc' | 'event';
export type DocMode = 'view' | 'edit';
