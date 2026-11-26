// 볼트가 열려 있지 않을 때: 볼트 열기 / 새 볼트 / 예시 작품으로 시작
interface Props {
  loading: boolean;
  error: string | null;
  onOpen: () => void;
  onCreate: (withSample: boolean) => void;
}

export function Welcome({ loading, error, onOpen, onCreate }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <span className="logo welcome-logo">CONST</span>
        <p className="welcome-lead">작품 하나 = 로컬 폴더 하나(볼트). 설정은 .md 파일로, 사건과 관계는 .const 폴더에 저장돼요.</p>
        {loading ? (
          <p className="welcome-note">볼트를 여는 중…</p>
        ) : (
          <div className="welcome-actions">
            <button type="button" className="welcome-btn primary" onClick={onOpen}>
              <span>볼트 열기…</span>
              <span className="welcome-key">Ctrl+O</span>
            </button>
            <button type="button" className="welcome-btn" onClick={() => onCreate(false)}>
              <span>새 볼트 만들기…</span>
              <span className="welcome-key">Ctrl+Shift+N</span>
            </button>
            <button type="button" className="welcome-btn" onClick={() => onCreate(true)}>
              <span>예시 작품으로 시작</span>
              <span className="welcome-key">아르덴 연대기</span>
            </button>
          </div>
        )}
        {error && <p className="welcome-error">{error}</p>}
      </div>
    </div>
  );
}
