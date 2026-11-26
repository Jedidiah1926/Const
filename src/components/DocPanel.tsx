// 문서 탭 (명세 8): 파일 경로 → 종류 + [보기 | 편집] → 본문 → 백링크 → 저장 상태
import { linksTo, parseMarkdown } from '../lib/markdown';
import type { DocMode, EntityId, Relation } from '../world/types';
import { useWorld } from '../world/worldIndex';
import { RelationList } from './RelationList';
import type { Inline } from '../lib/markdown';

interface Props {
  docId: EntityId;
  root: string;
  mode: DocMode;
  onMode: (m: DocMode) => void;
  onOpen: (id: EntityId) => void;
  onEdit: (raw: string) => void;
  savedLabel: string;
  onRelations: (r: Relation[]) => void;
}

export function DocPanel({ docId, root, mode, onMode, onOpen, onEdit, savedLabel, onRelations }: Props) {
  const { world, idByName, paletteOf, pathOf } = useWorld();
  const { entities: ENTITIES, docs } = world;
  const ent = ENTITIES[docId];
  const raw = docs[docId] ?? '';
  const backIds = Object.keys(docs).filter((id) => id !== docId && linksTo(docs[id], ent.name));

  const renderInline = (parts: Inline[]) =>
    parts.map((t, i) => {
      if (t.type === 'bold') return <strong key={i}>{t.text}</strong>;
      if (t.type === 'text') return <span key={i}>{t.text}</span>;
      const id = idByName[t.name];
      if (!id) {
        return (
          <button key={i} type="button" className="md-link missing" title={t.name + ' — 아직 없는 문서(누르면 새로 만들어요)'}>
            {t.name}
          </button>
        );
      }
      const p = paletteOf(id);
      return (
        <button
          key={i}
          type="button"
          className="md-link"
          title={t.name + ' 문서로 이동'}
          style={{ color: p.sel, textDecorationColor: p.c + '66' }}
          onClick={() => onOpen(id)}
        >
          {t.name}
        </button>
      );
    });

  return (
    <>
      <div className="doc-head">
        <span className="doc-path">{root + '/' + pathOf(docId)}</span>
        <div className="doc-meta">
          <span className="doc-kind">{ent.kind + (ent.isFolder ? ' · 폴더' : '')}</span>
          <div className="doc-modes">
            <button type="button" className="u-toggle" aria-pressed={mode === 'view'} onClick={() => onMode('view')}>보기</button>
            <button type="button" className="u-toggle" aria-pressed={mode === 'edit'} onClick={() => onMode('edit')}>편집</button>
          </div>
        </div>
      </div>
      <div className="doc-body">
        {mode === 'view' ? (
          parseMarkdown(raw).map((b, i) => (
            <div key={i} className={'md-' + b.type}>{renderInline(b.parts)}</div>
          ))
        ) : (
          <>
            <label className="sr-only" htmlFor="const-md">마크다운 본문</label>
            <textarea id="const-md" className="md-editor" value={raw} spellCheck={false} onChange={(e) => onEdit(e.target.value)} />
            <span className="md-hint">[[문서 이름]]으로 다른 문서에 연결해요. # 제목, - 목록, **굵게**</span>
          </>
        )}
        <RelationList id={docId} editing={mode === 'edit'} onOpen={onOpen} onChange={onRelations} />
        <div className="backlinks">
          <span className="backlinks-title">이 문서를 가리키는 문서 {backIds.length}</span>
          {backIds.map((id) => (
            <button key={id} type="button" className="backlink" style={{ color: paletteOf(id).text }} onClick={() => onOpen(id)}>
              {ENTITIES[id].name}
            </button>
          ))}
        </div>
      </div>
      <div className="doc-saved">{savedLabel}</div>
    </>
  );
}
