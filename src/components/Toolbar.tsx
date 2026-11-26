import { useState } from 'react';
import type { GroupBy } from '../world/types';

interface Props {
  isGrid: boolean;
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  showEra: boolean;
  onToggleEra: () => void;
  unitLabel: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  tags: string[];
}

export function Toolbar(p: Props) {
  const [tag, setTag] = useState<string | null>(null);
  return (
    <div className="toolbar">
      {p.isGrid && (
        <>
          <span className="tb-label">묶기</span>
          <button type="button" className="u-toggle" aria-pressed={p.groupBy === 'folder'} onClick={() => p.onGroupBy('folder')}>폴더별</button>
          <button type="button" className="u-toggle" aria-pressed={p.groupBy === 'kind'} onClick={() => p.onGroupBy('kind')}>종류별</button>
          <span className="tb-sep">│</span>
          <label className="tb-check"><input type="checkbox" checked={p.showEra} onChange={p.onToggleEra} />시대</label>
          <label className="tb-check"><input type="checkbox" />태그 색</label>
          <span className="tb-sep">│</span>
          <span className="tb-label">확대</span>
          <button type="button" className="sq-btn" aria-label="축소" onClick={p.onZoomOut}>−</button>
          <button type="button" className="sq-btn" aria-label="확대" onClick={p.onZoomIn}>+</button>
          <button type="button" className="sq-btn" aria-label="처음 화면으로" title="처음 화면으로" onClick={p.onZoomReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" />
            </svg>
          </button>
          <span style={{ color: 'var(--text-dim)', minWidth: 70 }}>눈금 {p.unitLabel}</span>
          <span className="tb-hint">핀치 · Ctrl+휠로 확대, 끌어서 이동</span>
          <span className="tb-sep">│</span>
        </>
      )}
      <span className="tb-label">태그</span>
      {p.tags.map((t) => (
        <button key={t} type="button" className="tag-btn" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>
      ))}
      <button type="button" className="tag-btn tag-add" aria-label="태그 추가">+</button>
    </div>
  );
}
