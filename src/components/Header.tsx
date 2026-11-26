import { VAULT_NAME } from '../data/sample';
import type { View } from '../data/types';

interface Props {
  view: View;
  onView: (v: View) => void;
}

export function Header({ view, onView }: Props) {
  return (
    <header className="header">
      <div className="header-cell">
        <span className="logo">CONST</span>
      </div>
      <div className="header-cell">
        <span className="doc-title">{VAULT_NAME}</span>
      </div>
      <label className="search">
        <span className="search-key num">/</span>
        <span className="sr-only">검색</span>
        <input type="search" placeholder="설정, 사건, 태그를 찾기" />
      </label>
      <nav aria-label="보기 방식" className="view-tabs">
        <button type="button" className="view-tab" aria-pressed={view === 'grid'} onClick={() => onView('grid')}>격자</button>
        <button type="button" className="view-tab" aria-pressed={false}>리스트</button>
        <button type="button" className="view-tab" aria-pressed={view === 'graph'} onClick={() => onView('graph')}>관계도</button>
        <button type="button" className="view-tab" aria-pressed={false}>지도</button>
      </nav>
    </header>
  );
}
