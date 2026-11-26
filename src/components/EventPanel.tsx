// 사건 탭: 보기 / 편집. 사건은 볼트의 .const/events.json에 저장돼요
import { atOf, dateLabel, DAYS, monthDayOf, MONTHS } from '../lib/calendar';
import type { ConstEvent, DocMode, EntityId } from '../world/types';
import { useWorld } from '../world/worldIndex';
import { CloseGlyph, FieldRow, IconButton, NumberField, SelectField, TagsField, TextField } from './fields';

interface Props {
  ev: ConstEvent | undefined;
  mode: DocMode;
  onMode: (m: DocMode) => void;
  onOpen: (id: EntityId) => void;
  onChange: (ev: ConstEvent) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function EventPanel({ ev, mode, onMode, onOpen, onChange, onNew, onDelete }: Props) {
  const ix = useWorld();
  const ENTITIES = ix.world.entities;

  const bar = (
    <div className="panel-bar">
      <button type="button" className="text-btn" onClick={onNew}>+ 새 사건</button>
      {ev && (
        <div className="doc-modes">
          <button type="button" className="u-toggle" aria-pressed={mode === 'view'} onClick={() => onMode('view')}>보기</button>
          <button type="button" className="u-toggle" aria-pressed={mode === 'edit'} onClick={() => onMode('edit')}>편집</button>
        </div>
      )}
    </div>
  );

  if (!ev) {
    return (
      <>
        {bar}
        <p className="aside-empty">사건이 없어요. ‘+ 새 사건’으로 만들면 .const/events.json에 저장돼요.</p>
      </>
    );
  }

  if (mode === 'view') {
    return (
      <>
        {bar}
        <div className="ev-head">
          <span className="ev-year">{ev.year}</span>
          <span className="ev-date">{ev.date}</span>
          <h2 className="ev-name">{ev.title}</h2>
          {ev.desc && <p className="ev-desc">{ev.desc}</p>}
        </div>
        <div className="ev-related">
          <span className="ev-related-title">관련 설정 {ev.rows.length}</span>
          {ev.rows.map((id) => (
            <div key={id} className="ev-chip">
              <button type="button" onClick={() => onOpen(id)}>{ENTITIES[id].name}</button>
              <span>{ENTITIES[id].kind}</span>
            </div>
          ))}
        </div>
        {ev.tags.length > 0 && <div className="ev-tags">{ev.tags.join(' ')}</div>}
      </>
    );
  }

  // ── 편집 ──
  const { m, d } = monthDayOf(ev.at);
  const set = (patch: Partial<ConstEvent>) => onChange({ ...ev, ...patch });
  // 월·일을 바꾸면 위치(at)와 날짜 표시를 함께 바꿔요. 날짜 표시는 '3월 2일 밤'처럼 직접 고칠 수도 있어요
  const setDate = (nm: number, nd: number) => set({ at: atOf(nm, nd), date: dateLabel(nm, nd) });
  const others = ix.ids.filter((id) => !ev.rows.includes(id));

  return (
    <>
      {bar}
      <div className="ev-form">
        <TextField label="제목" value={ev.title} onChange={(title) => set({ title })} grow />
        <FieldRow>
          <NumberField label="연도" value={ev.year} step={1} width={84} onCommit={(v) => v !== null && set({ year: Math.trunc(v) })} />
          <NumberField label="월" value={m} min={1} max={MONTHS} width={44} onCommit={(v) => v !== null && setDate(Math.trunc(v), d)} />
          <NumberField label="일" value={d} min={1} max={DAYS} width={44} onCommit={(v) => v !== null && setDate(m, Math.trunc(v))} />
          <TextField label="날짜 표시" value={ev.date} placeholder={dateLabel(m, d)} onChange={(date) => set({ date })} grow />
        </FieldRow>
        <TextField label="설명" value={ev.desc} multiline onChange={(desc) => set({ desc })} />

        <div className="field grow">
          <span className="field-label">관련 설정 {ev.rows.length} · 사건 노드가 이 줄들에 찍혀요</span>
          <div className="ev-rows">
            {ev.rows.map((id) => (
              <div key={id} className="ev-row-item">
                <button type="button" className="rel-target" style={{ color: ix.paletteOf(id).text }} onClick={() => onOpen(id)}>{ENTITIES[id].name}</button>
                <span className="kind">{ENTITIES[id].kind}</span>
                <IconButton label={ENTITIES[id].name + ' 빼기'} disabled={ev.rows.length <= 1} onClick={() => set({ rows: ev.rows.filter((r) => r !== id) })}>
                  <CloseGlyph />
                </IconButton>
              </div>
            ))}
          </div>
          {others.length > 0 && (
            <SelectField
              label="설정 더하기"
              hideLabel
              value=""
              options={[{ value: '', label: '+ 설정 더하기' }, ...others.map((id) => ({ value: id, label: ENTITIES[id].name }))]}
              onChange={(id) => id && set({ rows: [...ev.rows, id] })}
            />
          )}
        </div>

        <TagsField label="태그 (띄어쓰기로 구분)" value={ev.tags} placeholder="#전쟁 #조약" onChange={(tags) => set({ tags })} />

        <div className="ev-form-foot">
          <span className="field-label">.const/events.json에 자동 저장</span>
          <button
            type="button"
            className="text-btn danger"
            onClick={() => {
              if (window.confirm(`‘${ev.title}’ 사건을 지울까요?`)) onDelete(ev.id);
            }}
          >
            사건 지우기
          </button>
        </div>
      </div>
    </>
  );
}
