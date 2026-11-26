import { ENTITIES } from '../data/sample';
import type { ConstEvent, EntityId } from '../data/types';

interface Props {
  ev: ConstEvent;
  onOpen: (id: EntityId) => void;
}

export function EventPanel({ ev, onOpen }: Props) {
  return (
    <>
      <div className="ev-head">
        <span className="ev-year">{ev.year}</span>
        <span className="ev-date">{ev.date}</span>
        <h2 className="ev-name">{ev.title}</h2>
        <p className="ev-desc">{ev.desc}</p>
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
      <div className="ev-tags">{ev.tags}</div>
    </>
  );
}
