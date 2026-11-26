# Const

DOT의 세계관 노트 앱. 가로축 = 시간, 세로축 = 설정 목록.

```bash
npm install
npm run dev
```

시작 화면: `/` 격자(폴더별) · `/?group=kind` 격자(종류별) · `/?view=graph` 관계도.

- `src/data/` — 데이터 모델과 예시 작품(아르덴 연대기)
- `src/lib/` — 시간축(확대·눈금), 마크다운, 색, 로컬 저장
- `src/components/` — 헤더, 도구줄, 격자, 관계도, 문서·사건 패널, 상태줄
