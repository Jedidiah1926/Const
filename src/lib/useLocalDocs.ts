// 로컬 저장 (명세 8). 실제 앱은 볼트 폴더의 .md 파일에 쓰지만,
// 브라우저에서는 localStorage를 대신 써요. 입력이 멈춘 뒤 약 0.5초 후에 저장.
import { useEffect, useRef, useState } from 'react';
import type { EntityId } from '../data/types';

const KEY = 'const:docs';
const DEBOUNCE_MS = 500;

function load(fallback: Record<EntityId, string>): Record<EntityId, string> {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return { ...fallback, ...JSON.parse(s) };
  } catch {
    // 저장소를 못 쓰면 기본 문서로
  }
  return { ...fallback };
}

export function useLocalDocs(initial: Record<EntityId, string>) {
  const [docs, setDocs] = useState(() => load(initial));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(docs));
      } catch {
        // 무시
      }
      dirty.current = false;
      setSavedAt(Date.now());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [docs]);

  const setDoc = (id: EntityId, raw: string) => {
    dirty.current = true;
    setDocs((d) => ({ ...d, [id]: raw }));
  };

  return { docs, setDoc, savedLabel: '로컬에 자동 저장 · ' + (savedAt ? '방금 저장됨' : '저장됨') };
}
