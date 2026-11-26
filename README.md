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
npm run dev:web    # Electron 없이 브라우저로만 (예시 작품, 저장 안 함)
```

> `index.html`은 Vite 진입점이라 파일을 바로 열면 아무것도 안 나와요. 위 명령으로 실행하세요.

시작 화면은 주소 뒤에 붙여서 고를 수 있어요(`dev:web`): `?group=kind` 종류별, `?view=graph` 관계도.

## 볼트(로컬 저장)

작품 = 로컬 폴더 하나. 처음 켜면 **볼트 열기 / 새 볼트 만들기 / 예시 작품으로 시작** 중에서 고르고,
다음부터는 마지막 볼트가 바로 열려요. 메뉴 `파일 › 볼트 열기…`(Ctrl+O), `새 볼트…`(Ctrl+Shift+N),
또는 헤더의 작품 이름을 눌러 다른 볼트로 바꿀 수 있어요.

```
<볼트>/
  아르덴 왕국/_아르덴 왕국.md          폴더 자신의 문서 (폴더 = 디렉터리)
  아르덴 왕국/레아 바스.md             설정 문서 (이름 = 파일 이름)
  아르덴 왕국/그림자 서기국/카엘 도른.md  폴더 안의 폴더 = 하위 디렉터리
  .const/settings.json               관계 종류, 전체 시대, 종류 순서, 시간 범위
  .const/events.json                 사건
  .const/relations.json              관계 (end: null = 끝나지 않음)
  .const/layout.json                 관계도 노드 키프레임 · 구역 위치
```

설정 문서 맨 위 YAML frontmatter:

```yaml
---
id: kae          # 사건·관계가 가리키는 id. 없으면 앱이 만들어 적어 둬요
kind: 인물
start: 1200
end: 1232
tags: ["#비밀"]
order: 1         # 같은 폴더 안 순서 (없으면 이름 순)
# 폴더 문서만:
color: { c: "#E7C35A", head: …, text: …, sel: …, bg: …, muted: … }   # 또는 color: "#E7C35A"
eras: [{ name: 왕국 시대, start: 1200, end: 1214 }]
shape: rect      # 관계도 구역: circle | rect | free
---
```

- 문서 본문, 관계 종류(이름·색·보이기), 구역 모양을 고치면 0.5초 뒤 해당 파일에 저장돼요.
- 다른 편집기로 .md나 .const/*.json을 고치거나 파일을 추가·삭제하면 앱에 바로 반영돼요.
  저장 안 한 편집이 있으면 앱 쪽을 지켜요.
- 파일은 사람이 고칠 수 있으니, 잘못된 값은 건너뛰고 빠진 값은 기본값으로 채워요.

## 구조

| 경로 | 내용 |
| --- | --- |
| `electron/main.ts` | 메인 프로세스: 창·메뉴, 볼트 열기(마지막 볼트 기억), 읽기·쓰기, 파일 감시 |
| `electron/preload.ts` | 렌더러에 `window.constVault`만 열어 줌 (contextIsolation + sandbox) |
| `shared/ipc.ts` | 메인·렌더러가 함께 쓰는 IPC 채널과 타입 |
| `src/world/` | 데이터 모델, 볼트 파일 형식(`vaultFormat.ts`), 화면용 색인(`worldIndex.ts`), 볼트 훅(`useVault.ts`), 예시 작품 |
| `src/lib/` | 시간축(확대·눈금), 마크다운, 색 |
| `src/components/` | 시작 화면, 작업 화면, 헤더, 도구줄, 격자, 관계도, 문서·사건 패널, 상태줄 |

tsconfig는 셋으로 나뉘어요: `tsconfig.app.json`(렌더러), `tsconfig.electron.json`(메인·preload → `dist-electron/`), `tsconfig.node.json`(vite 설정).
