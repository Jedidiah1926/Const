// 볼트 열기·만들기·읽기·저장 (명세 8)
// Electron에서는 window.constVault로 실제 폴더를 다루고, 브라우저(npm run dev:web)에서는
// 예시 작품을 메모리에서만 다뤄요.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VaultFiles } from '../../shared/ipc';
import { SAMPLE_NAME, SAMPLE_WORLD } from './sample';
import type { EntityId, RelationKind, World, ZoneShape } from './types';
import { entityPath, loadWorld, serializeEntity, serializeSettings, serializeWorld, SETTINGS } from './vaultFormat';

const DEBOUNCE_MS = 500;
const RESCAN_MS = 250;

export type VaultStatus = 'loading' | 'none' | 'ready' | 'error';

/** 저장을 기다리는 것: 설정 문서 하나 또는 settings.json */
type Pending = `entity:${string}` | 'settings';

export interface VaultApi {
  status: VaultStatus;
  root: string | null;
  world: World | null;
  error: string | null;
  saveLabel: string;
  /** 브라우저 미리보기(파일 저장 없음)인지 */
  preview: boolean;
  open(): Promise<void>;
  create(withSample: boolean): Promise<void>;
  reveal(): void;
  setDoc(id: EntityId, body: string): void;
  setKinds(kinds: RelationKind[]): void;
  setShape(folder: EntityId, shape: ZoneShape): void;
}

export function useVault(): VaultApi {
  const api = window.constVault;
  const [status, setStatus] = useState<VaultStatus>(api ? 'loading' : 'ready');
  const [root, setRoot] = useState<string | null>(api ? null : '(미리보기) ' + SAMPLE_NAME);
  const [world, setWorld] = useState<World | null>(api ? null : structuredClone(SAMPLE_WORLD));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;
  const pending = useRef(new Set<Pending>());
  // 파일 경로는 저장 시점의 이름으로 계산하니, 처음 읽었을 때의 경로를 기억할 필요는 없어요
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fail = (e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  };

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const r = await api.current();
      setRoot(r);
      if (!r) {
        setWorld(null);
        setStatus('none');
        return;
      }
      const { world: w, fixes } = loadWorld(await api.scan());
      if (Object.keys(fixes).length) await api.writeMany(fixes);
      pending.current.clear();
      setWorld(w);
      setError(null);
      setSavedAt(null);
      setStatus('ready');
    } catch (e) {
      fail(e);
      setStatus('error');
    }
  }, [api]);

  // ── 저장: 바뀐 것만 모아서 0.5초 뒤에 ──
  const flush = useCallback(async () => {
    const w = worldRef.current;
    if (!api || !w || !pending.current.size) return;
    const keys = [...pending.current];
    pending.current.clear();
    const files: VaultFiles = {};
    for (const k of keys) {
      if (k === 'settings') files[SETTINGS] = serializeSettings(w);
      else {
        const id = k.slice('entity:'.length);
        if (w.entities[id]) files[entityPath(w.entities, id)] = serializeEntity(w, id);
      }
    }
    try {
      await api.writeMany(files);
      setError(null);
      setSavedAt(Date.now());
    } catch (e) {
      keys.forEach((k) => pending.current.add(k));
      fail(e);
    }
  }, [api]);

  const schedule = useCallback(
    (k: Pending) => {
      pending.current.add(k);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  // 처음 켤 때 마지막 볼트, 메뉴에서 다른 볼트를 열면 다시 읽기
  useEffect(() => {
    if (!api) return;
    void load();
    return api.onOpened(() => {
      void flush().then(load);
    });
  }, [api, load, flush]);

  // 바깥(다른 편집기 등)에서 파일이 바뀌면 다시 읽어요. 아직 저장 안 한 문서는 앱 쪽을 지켜요
  useEffect(() => {
    if (!api) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = api.onChanged(() => {
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const { world: next, fixes } = loadWorld(await api.scan());
          // id가 없는 새 문서는 바로 id를 적어 둬요. 안 그러면 다시 읽을 때마다 id가 바뀌어 사건·관계가 끊겨요
          if (Object.keys(fixes).length) await api.writeMany(fixes);
          const cur = worldRef.current;
          if (cur) {
            for (const k of pending.current) {
              if (k === 'settings') next.kinds = cur.kinds;
              else {
                const id = k.slice('entity:'.length);
                if (next.entities[id] && cur.entities[id]) {
                  next.docs[id] = cur.docs[id];
                  if (cur.shapes[id]) next.shapes[id] = cur.shapes[id];
                }
              }
            }
          }
          setWorld(next);
        } catch (e) {
          fail(e);
        }
      }, RESCAN_MS);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, [api]);

  // 창을 닫기 전에 남은 저장을 끝내요
  useEffect(() => {
    const onUnload = () => void flush();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [flush]);

  const open = async () => {
    if (!api) return;
    try {
      await flush();
      if (await api.openDialog()) await load();
    } catch (e) {
      fail(e);
    }
  };

  const create = async (withSample: boolean) => {
    if (!api) return;
    try {
      await flush();
      if (!(await api.createDialog(withSample ? SAMPLE_NAME : '새 작품'))) return;
      if (withSample) await api.writeMany(serializeWorld(SAMPLE_WORLD));
      await load();
    } catch (e) {
      fail(e);
    }
  };

  const update = (fn: (w: World) => World, k: Pending) => {
    setWorld((w) => (w ? fn(w) : w));
    if (api) schedule(k);
  };

  const preview = !api;
  const saveLabel = error
    ? '저장 실패 · ' + error
    : preview
      ? '브라우저 미리보기 · 파일에 저장하지 않아요'
      : '로컬에 자동 저장 · ' + (savedAt ? '방금 저장됨' : '저장됨');

  return {
    status, root, world, error, saveLabel, preview, open, create,
    reveal: () => void api?.reveal(),
    setDoc: (id, body) => update((w) => ({ ...w, docs: { ...w.docs, [id]: body } }), `entity:${id}`),
    setKinds: (kinds) => update((w) => ({ ...w, kinds }), 'settings'),
    setShape: (f, s) => update((w) => ({ ...w, shapes: { ...w.shapes, [f]: s } }), `entity:${f}`),
  };
}
