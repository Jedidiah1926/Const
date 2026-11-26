// 문서 저장 (명세 8). Electron에서는 볼트 폴더의 .md 파일에 직접 쓰고,
// 브라우저(npm run dev:web)에서는 localStorage에 대신 써요. 입력이 멈춘 뒤 약 0.5초 후에 저장.
import { useEffect, useRef, useState } from 'react';
import type { EntityId } from '../data/types';
import { docRelPath } from './entities';

const LS_KEY = 'const:docs';
const DEBOUNCE_MS = 500;

function loadLocal(fallback: Record<EntityId, string>): Record<EntityId, string> {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { ...fallback, ...JSON.parse(s) };
  } catch {
    // 저장소를 못 쓰면 기본 문서로
  }
  return { ...fallback };
}

export function useVaultDocs(initial: Record<EntityId, string>) {
  const vault = window.constVault;
  const [docs, setDocs] = useState(() => (vault ? { ...initial } : loadLocal(initial)));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(new Set<EntityId>());

  // 볼트에서 읽기. 파일이 없으면 메인 프로세스가 기본 본문으로 만들어요
  useEffect(() => {
    if (!vault) return;
    const ids = Object.keys(initial);
    const defaults = Object.fromEntries(ids.map((id) => [docRelPath(id), initial[id]]));
    vault
      .load(defaults)
      .then((files) => setDocs(Object.fromEntries(ids.map((id) => [id, files[docRelPath(id)] ?? initial[id]]))))
      .catch((e) => setError(String(e)));
  }, [vault, initial]);

  // 바깥(다른 편집기 등)에서 파일이 바뀌면 다시 읽어요. 아직 저장 안 한 편집이 있으면 앱 쪽을 지켜요
  useEffect(() => {
    if (!vault) return;
    const byRel = Object.fromEntries(Object.keys(initial).map((id) => [docRelPath(id), id]));
    return vault.onChanged(async (rel) => {
      const id = byRel[rel];
      if (!id || dirty.current.has(id)) return;
      const text = await vault.read(rel);
      if (text !== null) setDocs((d) => (d[id] === text ? d : { ...d, [id]: text }));
    });
  }, [vault, initial]);

  useEffect(() => {
    if (!dirty.current.size) return;
    const t = setTimeout(async () => {
      const ids = [...dirty.current];
      dirty.current.clear();
      try {
        if (vault) await Promise.all(ids.map((id) => vault.write(docRelPath(id), docs[id])));
        else localStorage.setItem(LS_KEY, JSON.stringify(docs));
        setError(null);
        setSavedAt(Date.now());
      } catch (e) {
        ids.forEach((id) => dirty.current.add(id));
        setError(String(e));
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [docs, vault]);

  const setDoc = (id: EntityId, raw: string) => {
    dirty.current.add(id);
    setDocs((d) => ({ ...d, [id]: raw }));
  };

  const where = vault ? '로컬에 자동 저장' : '브라우저에 자동 저장';
  const savedLabel = error ? '저장 실패 · ' + error : where + ' · ' + (savedAt ? '방금 저장됨' : '저장됨');
  return { docs, setDoc, savedLabel };
}
