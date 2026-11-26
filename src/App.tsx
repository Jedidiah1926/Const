import { useMemo } from 'react';
import { Welcome } from './components/Welcome';
import { Workspace } from './components/Workspace';
import { useVault } from './world/useVault';
import { buildIndex, WorldContext } from './world/worldIndex';

export function App() {
  const vault = useVault();
  const ix = useMemo(() => (vault.world ? buildIndex(vault.world) : null), [vault.world]);

  if (vault.status !== 'ready' || !ix || !vault.root) {
    return <Welcome loading={vault.status === 'loading'} error={vault.error} onOpen={vault.open} onCreate={vault.create} />;
  }
  return (
    <WorldContext.Provider value={ix}>
      {/* 볼트가 바뀌면 화면 상태(선택, 확대 등)를 새로 시작해요 */}
      <Workspace key={vault.root} vault={vault} root={vault.root} />
    </WorldContext.Provider>
  );
}
