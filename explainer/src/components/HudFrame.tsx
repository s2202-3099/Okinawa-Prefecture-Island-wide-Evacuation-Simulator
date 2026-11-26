import React from 'react';
import {RUNS} from '../data';
import type {MapState, stateAt} from '../timeline';
import {LINES} from '../timeline';
import {DayBox, TopLeft} from './Hud';

// 章や条件が切り替わった時刻を探して、見出しをふわっと出す
const changedAt = (f: number, pick: (i: number) => string | undefined) => {
  let at = 0, last: string | undefined;
  for (const l of LINES) {
    if (l.from > f) break;
    const v = pick(LINES.indexOf(l));
    if (v !== undefined && v !== last) { at = l.from; last = v; }
  }
  return at;
};

export const Hud: React.FC<{frame: number; map: MapState; st: ReturnType<typeof stateAt>}> = ({frame, map, st}) => {
  const secAt = changedAt(frame, (i) => LINES[i].cue.sec);
  const runAt = changedAt(frame, (i) => LINES[i].cue.run);
  const hideDay = st.panel && ['title', 'credits', 'list', 'chart'].includes((st.panel as {kind: string}).kind);
  return (
    <>
      <TopLeft sec={st.sec} runLabel={RUNS[map.run].label} secAt={secAt} runAt={runAt} frame={frame} />
      {!hideDay && <DayBox state={map} frame={frame} />}
    </>
  );
};
