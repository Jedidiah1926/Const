// 볼트가 열린 화면: 헤더, 도구줄, 격자/관계도, 오른쪽 패널, 상태줄
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fit, GRID_LEFT, pickUnit, zoomAt } from '../lib/timeScale';
import type { Viewport } from '../lib/timeScale';
import type { VaultApi } from '../world/useVault';
import type { AsideTab, DocMode, EntityId, GroupBy, LineMode, View } from '../world/types';
import { useWorld } from '../world/worldIndex';
import { DocPanel } from './DocPanel';
import { EventPanel } from './EventPanel';
import { GraphView } from './GraphView';
import { GridView } from './GridView';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { Toolbar } from './Toolbar';

// 브라우저 미리보기에서는 ?view=graph, ?group=kind 로 시작 화면을 고를 수 있어요
const params = new URLSearchParams(window.location.search);
const START_VIEW: View = params.get('view') === 'graph' ? 'graph' : 'grid';
const START_GROUP: GroupBy = params.get('group') === 'kind' ? 'kind' : 'folder';

const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

export function Workspace({ vault, root }: { vault: VaultApi; root: string }) {
  const ix = useWorld();
  const { world } = ix;
  const [view, setView] = useState<View>(START_VIEW);
  const [groupBy, setGroupBy] = useState<GroupBy>(START_GROUP);
  const [showEra, setShowEra] = useState(true);
  // 처음 선택: 사건이 여럿 몰린 해의 첫 사건 (예시 작품에서는 회색 항구 조약)
  const [selectedId, setSelectedId] = useState(() => {
    const busy = ix.events.find((e) => ix.events.filter((o) => o.year === e.year).length > 1);
    return (busy ?? ix.events[0])?.id ?? '';
  });
  const [yr, setYr] = useState(() => ix.events.find((e) => e.id === selectedId)?.year ?? world.span.start);
  const [asideTab, setAsideTab] = useState<AsideTab>('doc');
  // 처음 열 문서: 선택한 사건에 얽힌 첫 인물·설정(폴더 아닌 것), 없으면 첫 문서
  const [docIdState, setDocId] = useState<EntityId>(
    () => ix.events.find((e) => e.id === selectedId)?.rows.find((r) => !world.entities[r].isFolder) ?? ix.ids[0] ?? '',
  );
  const [docMode, setDocMode] = useState<DocMode>('view');
  const [lineMode, setLineMode] = useState<LineMode>('faction');
  const [vp, setVpState] = useState<Viewport>(() => fit(900, world.span));
  const [fitted, setFitted] = useState(false);

  const setVp = useCallback((fn: (v: Viewport) => Viewport) => setVpState(fn), []);
  const onFitted = useCallback(() => setFitted(true), []);
  // 격자를 다시 열면 화면 폭을 새로 재요
  useEffect(() => {
    if (view !== 'grid') setFitted(false);
  }, [view]);

  // 바깥에서 문서가 지워졌을 수도 있어요
  const docId = world.entities[docIdState] ? docIdState : ix.ids[0];

  // 관계도에서는 기준 연도 이하 가장 최근 사건이 현재 사건
  const eventAtYr = useMemo(() => ix.events.filter((e) => e.year <= yr).pop() ?? ix.events[0], [ix.events, yr]);
  const selected = view === 'graph' ? eventAtYr : ix.events.find((e) => e.id === selectedId);

  const openDoc = (id: EntityId) => {
    setAsideTab('doc');
    setDocId(id);
    setDocMode('view');
  };
  const center = () => GRID_LEFT + (vp.viewW - GRID_LEFT) / 2;

  return (
    <div className="app">
      <Header view={view} onView={setView} vaultName={baseName(root)} onOpenVault={vault.preview ? undefined : vault.open} />
      <div className="app-body">
        <main className="main">
          <Toolbar
            isGrid={view === 'grid'}
            groupBy={groupBy}
            onGroupBy={setGroupBy}
            showEra={showEra}
            onToggleEra={() => setShowEra((v) => !v)}
            unitLabel={pickUnit(vp.ppy)[1]}
            onZoomIn={() => setVp((v) => zoomAt(v, center(), 1.6))}
            onZoomOut={() => setVp((v) => zoomAt(v, center(), 1 / 1.6))}
            onZoomReset={() => setVp((v) => fit(v.viewW, world.span))}
            tags={ix.tags}
          />
          {ix.ids.length === 0 ? (
            <div className="empty-main">
              <p>아직 설정이 없어요.</p>
              <p>볼트 폴더에 <code>.md</code> 파일이나 폴더를 만들면 여기에 바로 나타나요.</p>
              {!vault.preview && <button type="button" className="welcome-btn" onClick={vault.reveal}>볼트 폴더 열기</button>}
            </div>
          ) : view === 'grid' ? (
            <GridView
              vp={vp}
              setVp={setVp}
              fitted={fitted}
              onFitted={onFitted}
              groupBy={groupBy}
              showEra={showEra}
              selected={selected}
              onPickEvent={(ev) => {
                setSelectedId(ev.id);
                setYr(ev.year);
                setAsideTab('event');
              }}
              onOpenDoc={openDoc}
            />
          ) : (
            <GraphView
              yr={yr}
              onYear={(y, id) => {
                setYr(y);
                if (id) setSelectedId(id);
              }}
              currentEvent={eventAtYr}
              kinds={world.kinds}
              setKinds={vault.setKinds}
              lineMode={lineMode}
              onLineMode={setLineMode}
              onShape={vault.setShape}
            />
          )}
          <StatusBar root={root} />
        </main>

        <aside className="aside">
          <div role="tablist" aria-label="오른쪽 패널" className="aside-tabs">
            <button type="button" role="tab" className="aside-tab" aria-selected={asideTab === 'doc'} onClick={() => setAsideTab('doc')}>문서</button>
            <button type="button" role="tab" className="aside-tab" aria-selected={asideTab === 'event'} onClick={() => setAsideTab('event')}>사건</button>
          </div>
          {asideTab === 'doc' ? (
            docId ? (
              <DocPanel
                docId={docId}
                root={root}
                mode={docMode}
                onMode={setDocMode}
                onOpen={openDoc}
                onEdit={(raw) => vault.setDoc(docId, raw)}
                savedLabel={vault.saveLabel}
              />
            ) : (
              <p className="aside-empty">열린 문서가 없어요.</p>
            )
          ) : selected ? (
            <EventPanel ev={selected} onOpen={openDoc} />
          ) : (
            <p className="aside-empty">사건이 없어요. .const/events.json에 사건을 추가하면 여기에 나타나요.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
