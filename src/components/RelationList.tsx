// 문서 탭의 '관계' 구역: 이 설정에서 나가는 관계(→)와 들어오는 관계(←).
// 관계는 항상 방향이 있어요(출발→대상). 서로 같은 관계면 양쪽 두 개를 저장해요 (명세 1).
// 편집 모드에서 방향·상대·종류·기간을 고치고 더하거나 지울 수 있어요. .const/relations.json에 저장돼요.
import { yearText } from '../lib/calendar';
import type { EntityId, Relation } from '../world/types';
import { useWorld } from '../world/worldIndex';
import { CloseGlyph, IconButton, NumberField, SelectField } from './fields';

interface Props {
  id: EntityId;
  editing: boolean;
  onOpen: (id: EntityId) => void;
  onChange: (relations: Relation[]) => void;
}

export function RelationList({ id, editing, onOpen, onChange }: Props) {
  const ix = useWorld();
  const { relations, kinds, entities: E, span } = ix.world;
  const kindOf = Object.fromEntries(kinds.map((k) => [k.id, k]));
  // 원래 배열에서의 자리(i)를 기억해 두고 고쳐요
  const mine = relations.map((r, i) => ({ r, i })).filter(({ r }) => r[0] === id || r[1] === id);
  // 보기에서는 나가는 관계 먼저, 시작 연도 순. 편집 중에는 고치는 줄이 움직이지 않게 파일 순서 그대로
  if (!editing) mine.sort((a, b) => Number(a.r[0] !== id) - Number(b.r[0] !== id) || a.r[3] - b.r[3]);

  const replace = (i: number, r: Relation) => onChange(relations.map((x, j) => (j === i ? r : x)));
  const remove = (i: number) => onChange(relations.filter((_, j) => j !== i));
  const others = ix.ids.filter((o) => o !== id);
  const add = () => {
    const other = others[0];
    if (!other || !kinds[0]) return;
    onChange([...relations, [id, other, kinds[0].id, Math.floor(span.start), Infinity]]);
  };

  const years = (r: Relation) => {
    const s = yearText(r[3]), e = yearText(r[4]);
    return s || e ? `${s || '…'}~${e}` : '';
  };

  return (
    <div className="rel-section">
      <span className="backlinks-title">관계 {mine.length}</span>
      {mine.map(({ r, i }) => {
        const out = r[0] === id;
        const other = out ? r[1] : r[0];
        const k = kindOf[r[2]];
        if (!editing) {
          return (
            <div key={i} className="rel-item">
              <span className="rel-dir" aria-label={out ? '나가는 관계' : '들어오는 관계'}>{out ? '→' : '←'}</span>
              <button type="button" className="rel-target" style={{ color: ix.paletteOf(other).text }} onClick={() => onOpen(other)}>{E[other].name}</button>
              <span className="rel-kind" style={{ color: k?.color ?? 'var(--text-dim)' }}>{k?.name ?? r[2]}</span>
              <span className="rel-years num">{years(r)}</span>
            </div>
          );
        }
        const setOther = (o: EntityId) => replace(i, out ? [id, o, r[2], r[3], r[4]] : [o, id, r[2], r[3], r[4]]);
        return (
          <div key={i} className="rel-edit">
            <SelectField
              label="방향"
              hideLabel
              value={out ? 'out' : 'in'}
              options={[{ value: 'out', label: '→ 나감' }, { value: 'in', label: '← 들어옴' }]}
              onChange={(v) => (v === 'out') !== out && replace(i, [r[1], r[0], r[2], r[3], r[4]])}
            />
            <SelectField label="상대" hideLabel value={other} options={others.map((o) => ({ value: o, label: E[o].name }))} onChange={setOther} style={{ maxWidth: 120 }} />
            <SelectField
              label="종류"
              hideLabel
              value={r[2]}
              options={[...kinds.map((kk) => ({ value: kk.id, label: kk.name })), ...(k ? [] : [{ value: r[2], label: r[2] + ' (없는 종류)' }])]}
              onChange={(v) => replace(i, [r[0], r[1], v, r[3], r[4]])}
              style={{ color: k?.color }}
            />
            <NumberField label="시작" hideLabel placeholder="시작" allowEmpty width={52} value={Number.isFinite(r[3]) ? r[3] : null} onCommit={(v) => replace(i, [r[0], r[1], r[2], v ?? -Infinity, r[4]])} />
            <span className="rel-dir">~</span>
            <NumberField label="끝" hideLabel placeholder="계속" allowEmpty width={52} value={Number.isFinite(r[4]) ? r[4] : null} onCommit={(v) => replace(i, [r[0], r[1], r[2], r[3], v ?? Infinity])} />
            <IconButton label="관계 지우기" onClick={() => remove(i)}>
              <CloseGlyph />
            </IconButton>
          </div>
        );
      })}
      {editing && others.length > 0 && kinds.length > 0 && (
        <button type="button" className="text-btn" onClick={add}>+ 관계 추가</button>
      )}
      {!editing && mine.length === 0 && <span className="field-label">편집에서 관계를 더할 수 있어요.</span>}
    </div>
  );
}
