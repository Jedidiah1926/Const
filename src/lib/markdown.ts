// 최소 마크다운 (명세 8): # 제목, ## 소제목, - 목록, **굵게**, [[링크]]

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; name: string };

export type Block =
  | { type: 'h1' | 'h2' | 'li' | 'p'; parts: Inline[] };

export function parseInline(txt: string): Inline[] {
  return txt
    .split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((t): Inline => {
      if (t.startsWith('[[')) return { type: 'link', name: t.slice(2, -2) };
      if (t.startsWith('**')) return { type: 'bold', text: t.slice(2, -2) };
      return { type: 'text', text: t };
    });
}

export function parseMarkdown(raw: string): Block[] {
  return raw
    .split('\n')
    .filter((l) => l.trim())
    .map((l): Block => {
      if (l.startsWith('# ')) return { type: 'h1', parts: parseInline(l.slice(2)) };
      if (l.startsWith('## ')) return { type: 'h2', parts: parseInline(l.slice(3)) };
      if (l.startsWith('- ')) return { type: 'li', parts: parseInline(l.slice(2)) };
      return { type: 'p', parts: parseInline(l) };
    });
}

/** 본문에 [[name]]이 들어 있는지 */
export const linksTo = (raw: string, name: string) => raw.includes('[[' + name + ']]');
