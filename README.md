# Const

DOT의 세계관 노트 앱. 가로축 = 시간, 세로축 = 설정 목록.
Electron + React + TypeScript + Vite.

## 실행

```bash
npm install
npm run dev        # 개발: Vite + Electron 창 (렌더러는 저장하면 바로 반영)
npm start          # 빌드한 결과로 Electron 실행
npm run dist       # 설치 파일 만들기 → release/ (macOS dmg · Windows nsis · Linux AppImage)
npm run dist:dir   # 설치 파일 없이 앱 폴더만 → release/*-unpacked
npm run typecheck  # 렌더러 · Electron · 설정 전체 타입 검사
npm run dev:web    # Electron 없이 브라우저로만 (저장은 localStorage)
```

> `index.html`은 Vite 진입점이라 파일을 바로 열면 아무것도 안 나와요. 위 명령으로 실행하세요.

시작 화면은 주소 뒤에 붙여서 고를 수 있어요(`dev:web`): `?group=kind` 종류별, `?view=graph` 관계도.

## 볼트(로컬 저장)

작품 = 로컬 폴더 하나. 지금은 `~/Const/아르덴 연대기/`에 처음 실행할 때 예시 문서가 만들어져요.

```
~/Const/아르덴 연대기/
  아르덴 왕국/_아르덴 왕국.md      ← 폴더 자신의 문서
  아르덴 왕국/레아 바스.md
  아르덴 왕국/그림자 서기국/카엘 도른.md
  ...
```

- 편집하면 입력이 멈춘 뒤 0.5초 후에 .md 파일로 저장돼요.
- 다른 편집기로 파일을 고치면 앱에 바로 반영돼요(저장 안 한 편집이 있으면 앱 쪽을 지켜요).

## 구조

| 경로 | 내용 |
| --- | --- |
| `electron/main.ts` | 메인 프로세스: 창, 볼트 읽기·쓰기, 파일 감시 |
| `electron/preload.ts` | 렌더러에 `window.constVault`만 열어 줌 (contextIsolation + sandbox) |
| `shared/ipc.ts` | 메인·렌더러가 함께 쓰는 IPC 채널과 타입 |
| `src/data/` | 데이터 모델과 예시 작품 |
| `src/lib/` | 시간축(확대·눈금), 마크다운, 색, 볼트 문서 훅 |
| `src/components/` | 헤더, 도구줄, 격자, 관계도, 문서·사건 패널, 상태줄 |

tsconfig는 셋으로 나뉘어요: `tsconfig.app.json`(렌더러), `tsconfig.electron.json`(메인·preload → `dist-electron/`), `tsconfig.node.json`(vite 설정).
