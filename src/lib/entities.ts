import { ENTITIES, PALETTES, VAULT_PATH } from '../data/sample';
import type { EntityId, Palette } from '../data/types';

/** 설정의 색 = 바로 위 폴더의 팔레트 */
export const folderOf = (id: EntityId): EntityId => (ENTITIES[id].isFolder ? id : ENTITIES[id].folder!);
export const paletteOf = (id: EntityId): Palette => PALETTES[folderOf(id)];
export const depthOf = (f: EntityId): number => {
  const p = ENTITIES[f].parent;
  return p ? 1 + depthOf(p) : 0;
};

/** 볼트 안의 상대 경로. 앱의 폴더 = 실제 디렉터리, 폴더 자신의 문서는 '_폴더이름.md' */
export function docRelPath(id: EntityId): string {
  const e = ENTITIES[id];
  const chain: string[] = [];
  let f: EntityId | null | undefined = e.isFolder ? id : e.folder;
  while (f) {
    chain.unshift(ENTITIES[f].name);
    f = ENTITIES[f].parent;
  }
  chain.push(e.isFolder ? '_' + e.name + '.md' : e.name + '.md');
  return chain.join('/');
}

export const docPath = (id: EntityId): string => VAULT_PATH + '/' + docRelPath(id);

export const idByName: Record<string, EntityId> = Object.fromEntries(
  Object.entries(ENTITIES).map(([id, e]) => [e.name, id]),
);
