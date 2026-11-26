// 예시 작품: 아르덴 연대기. 실제 앱에서는 로컬 볼트(~/Const/아르덴 연대기/)에서 읽어요
import type { ConstEvent, Entity, EntityId, Era, Palette, Relation, RelationKind, ZoneShape } from './types';

export const VAULT_NAME = '아르덴 연대기';
export const VAULT_PATH = '~/Const/' + VAULT_NAME;

export const ENTITIES: Record<EntityId, Entity> = {
  ard: { name: '아르덴 왕국', kind: '세력', isFolder: true, parent: null, s: 1200, e: 1240 },
  lea: { name: '레아 바스', kind: '인물', folder: 'ard', s: 1203, e: 1240 },
  gra: { name: '회색 항구', kind: '장소', folder: 'ard', s: 1200, e: 1240 },
  sha: { name: '그림자 서기국', kind: '조직', isFolder: true, parent: 'ard', s: 1200, e: 1240 },
  kae: { name: '카엘 도른', kind: '인물', folder: 'sha', s: 1200, e: 1232 },
  nor: { name: '북부 연합', kind: '세력', isFolder: true, parent: null, s: 1208, e: 1240 },
  reb: { name: '봉기군', kind: '조직', isFolder: true, parent: 'nor', s: 1218, e: 1240 },
  mir: { name: '미라 세인', kind: '인물', folder: 'reb', s: 1212, e: 1240 },
};

export const FOLDER_ORDER: EntityId[] = ['ard', 'sha', 'nor', 'reb'];

/** 폴더별 보기: 폴더 트리를 펼친 순서. 최상위 폴더마다 한 그룹 */
export const FOLDER_GROUPS: { folder: EntityId; ids: EntityId[] }[] = [
  { folder: 'ard', ids: ['ard', 'lea', 'gra', 'sha', 'kae'] },
  { folder: 'nor', ids: ['nor', 'reb', 'mir'] },
];

/** 종류별 보기 */
export const KIND_GROUPS: { label: string; ids: EntityId[] }[] = [
  { label: '세력', ids: ['ard', 'nor'] },
  { label: '조직', ids: ['sha', 'reb'] },
  { label: '인물', ids: ['lea', 'kae', 'mir'] },
  { label: '장소', ids: ['gra'] },
];

/** 하위 폴더 기본색은 상위 폴더 계열에서 한 톤 바꾼 색 */
export const PALETTES: Record<EntityId, Palette> = {
  ard: { c: '#FFA41C', head: '#F2E6D0', text: '#D9CBB0', sel: '#FFA41C', bg: '#100C08', muted: '#8C7C62' },
  sha: { c: '#E7C35A', head: '#F3EBD2', text: '#DCD0AE', sel: '#F0CF6A', bg: '#100E08', muted: '#8F8462' },
  nor: { c: '#9DB8C7', head: '#DDE6EB', text: '#B4C4CD', sel: '#CFE3EE', bg: '#0B0F12', muted: '#7F8E98' },
  reb: { c: '#7FB3A8', head: '#D7E8E3', text: '#A9C6BF', sel: '#BFE6DC', bg: '#0A100F', muted: '#7A938D' },
};

export const EVENTS: ConstEvent[] = [
  { id: 'e1', title: '레아 즉위', year: 1205, at: 0.33, ord: 0, date: '5월 1일', rows: ['ard', 'lea'], desc: '레아 바스가 아르덴의 왕좌에 오른다.', tags: '#왕가' },
  { id: 'e2', title: '회색 항구 조약', year: 1214, at: 0.17, ord: 0, date: '3월 2일', rows: ['ard', 'nor', 'lea', 'kae', 'gra'], desc: '아르덴과 북부 연합이 회색 항구에서 휴전에 서명한다.', tags: '#전쟁 #조약' },
  { id: 'e5', title: '비밀 조항', year: 1214, at: 0.17, ord: 1, date: '3월 2일 밤', rows: ['sha', 'kae', 'nor'], desc: '같은 날 밤, 그림자 서기국의 카엘 도른이 북부 연합과 비밀 조항을 덧붙인다.', tags: '#비밀' },
  { id: 'e6', title: '봉쇄 해제', year: 1214, at: 0.54, ord: 2, date: '7월 15일', rows: ['lea', 'gra', 'nor'], desc: '레아가 회색 항구의 봉쇄를 풀고 북부 상선의 입항을 허락한다.', tags: '#조약' },
  { id: 'e3', title: '북부 봉기', year: 1222, at: 0.77, ord: 0, date: '10월 9일', rows: ['nor', 'reb', 'mir'], desc: '미라 세인이 봉기군을 세우고 북부 연합의 봉기를 이끈다.', tags: '#전쟁' },
  { id: 'e4', title: '카엘의 배신', year: 1231, at: 0.05, ord: 0, date: '1월 20일', rows: ['kae', 'lea', 'mir'], desc: '카엘 도른이 조약의 비밀 조항을 폭로한다.', tags: '#비밀' },
];

/** 전체 시대 + 폴더마다 다른 시대 */
export const GLOBAL_ERAS: Era[] = [
  { name: '구항로 시대', s: 1200, e: 1220 },
  { name: '신항로 시대', s: 1220, e: 1240 },
];
export const FOLDER_ERAS: Record<EntityId, Era[]> = {
  ard: [{ name: '왕국 시대', s: 1200, e: 1214 }, { name: '분열기', s: 1214, e: 1240 }],
  nor: [{ name: '부족 동맹기', s: 1208, e: 1222 }, { name: '봉기 시대', s: 1222, e: 1240 }],
};

export const DEFAULT_KINDS: RelationKind[] = [
  { id: '동맹', name: '동맹', color: '#5FD39A', on: true },
  { id: '적대', name: '적대', color: '#FF6B57', on: true },
  { id: '증오', name: '증오', color: '#B58CFF', on: true },
];

/** 폴더에 들어 있다는 것만으로는 선을 긋지 않아요. 사용자가 맺은 관계만 */
export const RELATIONS: Relation[] = [
  ['ard', 'nor', '적대', 1208, 1214], ['nor', 'ard', '적대', 1208, 1214],
  ['ard', 'nor', '동맹', 1214, 1222], ['nor', 'ard', '동맹', 1214, 1222],
  ['ard', 'nor', '적대', 1222, 9999], ['nor', 'ard', '적대', 1222, 9999],
  ['reb', 'ard', '적대', 1222, 9999],
  ['lea', 'kae', '동맹', 1205, 1231], ['kae', 'lea', '동맹', 1205, 1225], ['kae', 'lea', '적대', 1225, 9999], ['lea', 'kae', '적대', 1231, 9999],
  ['kae', 'mir', '동맹', 1231, 9999], ['mir', 'kae', '동맹', 1231, 9999],
  ['lea', 'mir', '적대', 1222, 9999], ['mir', 'lea', '적대', 1222, 1226], ['mir', 'lea', '증오', 1226, 9999],
];

/** 관계도 노드 위치 키프레임: [연도, x, y] (760×520 영역) */
export const GRAPH_KEYS: Record<EntityId, [number, number, number][]> = {
  ard: [[1200, 250, 210]],
  lea: [[1200, 120, 120]],
  gra: [[1200, 330, 400]],
  sha: [[1200, 105, 335]],
  kae: [[1200, 165, 395], [1229, 165, 395], [1234, 470, 455]],
  nor: [[1200, 575, 200], [1212, 575, 200], [1216, 540, 215], [1220, 540, 215], [1224, 585, 195]],
  reb: [[1200, 600, 345]],
  mir: [[1200, 660, 400]],
};

export const ZONE_BASE: Record<EntityId, { cx: number; cy: number; r: number }> = {
  ard: { cx: 215, cy: 265, r: 200 },
  sha: { cx: 140, cy: 375, r: 62 },
  nor: { cx: 610, cy: 285, r: 140 },
  reb: { cx: 630, cy: 380, r: 58 },
};

export const DEFAULT_SHAPES: Record<EntityId, ZoneShape> = { ard: 'free', nor: 'circle', sha: 'rect', reb: 'circle' };

export const TAGS = ['#전쟁', '#왕가', '#비밀'];

/** 문서 본문(마크다운). 실제 앱에서는 로컬 폴더의 .md 파일 */
export const DOCS: Record<EntityId, string> = {
  ard: '# 아르덴 왕국\n서해안의 왕국. 왕도는 [[회색 항구]]에서 사흘 거리의 내륙에 있다.\n## 주요 인물\n- [[레아 바스]] — 1205년 즉위한 여왕\n- [[카엘 도른]] — [[그림자 서기국]]의 서기관\n## 바깥과의 관계\n- [[북부 연합]]과 1214년 **회색 항구 조약**으로 휴전\n- 1222년 이후 [[봉기군]]과 적대',
  lea: '# 레아 바스\n아르덴의 여왕. 1205년에 즉위했다. 바다보다 문서를 믿는 사람.\n- 소속: [[아르덴 왕국]]\n- 믿었던 사람: [[카엘 도른]] (1231년까지)\n- 적: [[미라 세인]]\n## 메모\n즉위식 날 [[회색 항구]]의 등대가 꺼졌다는 소문이 돈다. 출처는 [[항구 연대기]].',
  gra: '# 회색 항구\n아르덴 서쪽 끝의 항구 도시. 안개가 잦다.\n- 1214년 **회색 항구 조약**이 맺어진 곳\n- 같은 해 7월 [[레아 바스]]가 봉쇄를 풀었다',
  sha: '# 그림자 서기국\n[[아르덴 왕국]]의 기록 관청. 공식 문서와 비공식 문서를 함께 쓴다.\n- 수석 서기관: [[카엘 도른]]',
  kae: '# 카엘 도른\n[[그림자 서기국]]의 서기관. **회색 항구 조약**의 비밀 조항을 쓴 사람.\n## 흐름\n- 1205년 [[레아 바스]]의 신임을 얻는다\n- 1225년부터 몰래 레아를 등진다\n- 1231년 비밀 조항을 폭로하고 [[미라 세인]]과 손잡는다\n## 메모\n왼손잡이. 서명할 때만 오른손을 쓴다.',
  nor: '# 북부 연합\n북쪽 부족들의 연합. 1208년에 결성.\n- 1214년 [[아르덴 왕국]]과 휴전\n- 1222년부터 [[봉기군]]이 실권을 쥔다',
  reb: '# 봉기군\n[[북부 연합]] 안에서 1218년에 생긴 무장 조직.\n- 지도자: [[미라 세인]]',
  mir: '# 미라 세인\n[[봉기군]]의 지도자. 1222년 북부 봉기를 이끌었다.\n- [[레아 바스]]를 증오한다(1226년부터)\n- 1231년 [[카엘 도른]]과 동맹',
};
