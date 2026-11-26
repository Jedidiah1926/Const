import { useCallback, useEffect, useMemo, useState } from 'react';
import { DocPanel } from './components/DocPanel';
import { EventPanel } from './components/EventPanel';
import { GraphView } from './components/GraphView';
import { GridView } from './components/GridView';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { Toolbar } from './components/Toolbar';
import { DEFAULT_KINDS, DEFAULT_SHAPES, DOCS, EVENTS } from './data/sample';
import type { AsideTab, DocMode, EntityId, GroupBy, LineMode, RelationKind, View, ZoneShape } from './data/types';
import { fit, GRID_LEFT, pickUnit, zoomAt } from './lib/timeScale';
import type { Viewport } from './lib/timeScale';
import { useVaultDocs } from './lib/useVaultDocs';

// ?view=graph, ?group=kind 로 시작 화면을 고를 수 있어요
const params = new URLSearchParams(window.location.search);
const START_VIEW: View = params.get('view') === 'graph' ? 'graph' : 'grid';
const START_GROUP: GroupBy = params.get('group') === 'kind' ? 'kind' : 'folder';

export function App() {
  const [view, setView] = useState<View>(START_VIEW);
  const [groupBy, setGroupBy] = useState<GroupBy>(START_GROUP);
  const [showEra, setShowEra] = useState(true);
  const [selectedId, setSelectedId] = useState('e2');
  const [yr, setYr] = useState(1214);
  const [asideTab, setAsideTab] = useState<AsideTab>('doc');
  const [docId, setDocId] = useState<EntityId>('kae');
  const [docMode, setDocMode] = useState<DocMode>('view');
  const [kinds, setKinds] = useState<RelationKind[]>(DEFAULT_KINDS);
  const [shapes, setShapes] = useState<Record<EntityId, ZoneShape>>(DEFAULT_SHAPES);
  const [lineMode, setLineMode] = useState<LineMode>('faction');
  const [vp, setVpState] = useState<Viewport>(() => fit(900));
  const [fitted, setFitted] = useState(false);
  const { docs, setDoc, savedLabel } = useVaultDocs(DOCS);

  const setVp = useCallback((fn: (v: Viewport) => Viewport) => setVpState(fn), []);
  const onFitted = useCallback(() => setFitted(true), []);
  // 격자를 다시 열면 화면 폭을 새로 재요
  useEffect(() => {
    if (view !== 'grid') setFitted(false);
  }, [view]);

  // 관계도에서는 기준 연도 이하 가장 최근 사건이 현재 사건
  const eventAtYr = useMemo(
    () => EVENTS.slice().sort((a, b) => a.year - b.year || a.ord - b.ord).filter((e) => e.year <= yr).pop() ?? EVENTS[0],
    [yr],
  );
  const selected = view === 'graph' ? eventAtYr : EVENTS.find((e) => e.id === selectedId)!;

  const openDoc = (id: EntityId) => {
    setAsideTab('doc');
    setDocId(id);
    setDocMode('view');
  };
  const center = () => GRID_LEFT + (vp.viewW - GRID_LEFT) / 2;

  return (
    <div className="app">
      <Header view={view} onView={setView} />
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
            onZoomReset={() => setVp((v) => fit(v.viewW))}
          />
          {view === 'grid' ? (
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
              kinds={kinds}
              setKinds={setKinds}
              lineMode={lineMode}
              onLineMode={setLineMode}
              shapes={shapes}
              onShape={(f, s) => setShapes((prev) => ({ ...prev, [f]: s }))}
            />
          )}
          <StatusBar />
        </main>

        <aside className="aside">
          <div role="tablist" aria-label="오른쪽 패널" className="aside-tabs">
            <button type="button" role="tab" className="aside-tab" aria-selected={asideTab === 'doc'} onClick={() => setAsideTab('doc')}>문서</button>
            <button type="button" role="tab" className="aside-tab" aria-selected={asideTab === 'event'} onClick={() => setAsideTab('event')}>사건</button>
          </div>
          {asideTab === 'doc' ? (
            <DocPanel
              docId={docId}
              docs={docs}
              mode={docMode}
              onMode={setDocMode}
              onOpen={openDoc}
              onEdit={(raw) => setDoc(docId, raw)}
              savedLabel={savedLabel}
            />
          ) : (
            <EventPanel ev={selected} onOpen={openDoc} />
          )}
        </aside>
      </div>
    </div>
  );
}
