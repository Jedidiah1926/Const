// 편집 화면용 입력칸. 둥근 모서리·카드 없이 밑줄 1px (명세 7)
import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';

/** 숫자 입력: 입력 중에는 글자 그대로 두고, 올바른 숫자일 때만 반영해요 */
export function NumberField({
  value, onCommit, label, min, max, step = 1, allowEmpty = false, placeholder, width = 72, hideLabel = false,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
  placeholder?: string;
  width?: number;
  hideLabel?: boolean;
}) {
  const id = useId();
  const shown = value === null || !Number.isFinite(value) ? '' : String(value);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const valid = (t: string) => {
    if (t.trim() === '') return allowEmpty;
    const n = Number(t);
    return Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max);
  };
  return (
    <span className="field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field-label'}>{label}</label>
      <input
        id={id}
        type="number"
        className={'field-input num' + (valid(text) ? '' : ' invalid')}
        style={{ width }}
        value={text}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-invalid={!valid(text)}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (valid(t)) onCommit(t.trim() === '' ? null : Number(t));
        }}
        onBlur={() => setText(shown)}
      />
    </span>
  );
}

export function TextField({ value, onChange, label, placeholder, multiline = false, grow = false }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  grow?: boolean;
}) {
  const id = useId();
  return (
    <span className={'field' + (grow || multiline ? ' grow' : '')}>
      <label htmlFor={id} className="field-label">{label}</label>
      {multiline ? (
        <textarea id={id} className="field-input field-area" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" className="field-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </span>
  );
}

export function SelectField<T extends string>({ value, onChange, label, options, hideLabel = false, style }: {
  value: T;
  onChange: (v: T) => void;
  label: string;
  options: { value: T; label: string }[];
  hideLabel?: boolean;
  style?: React.CSSProperties;
}) {
  const id = useId();
  return (
    <span className="field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field-label'}>{label}</label>
      <select id={id} className="field-input field-select" value={value} style={style} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}

/** 아이콘만 있는 작은 버튼 (지우기 등) */
export function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export const CloseGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** 태그 입력: 띄어쓰기로 구분. 입력 중 글자(끝 띄어쓰기 포함)는 그대로 두고 태그 목록만 반영해요 */
export function TagsField({ value, onChange, label, placeholder }: {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  placeholder?: string;
}) {
  const id = useId();
  const parse = (t: string) => t.split(/\s+/).filter(Boolean).map((x) => (x.startsWith('#') ? x : '#' + x));
  const joined = value.join(' ');
  const [text, setText] = useState(joined);
  useEffect(() => {
    setText((t) => (parse(t).join(' ') === joined ? t : joined));
  }, [joined]);
  return (
    <span className="field grow">
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        type="text"
        className="field-input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parse(e.target.value));
        }}
        onBlur={() => setText(joined)}
      />
    </span>
  );
}
