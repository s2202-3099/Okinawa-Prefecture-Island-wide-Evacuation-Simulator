import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {COAST, nodeIndex, nodesOf, RUNS, type Run} from '../data';
import {arc, H, project, W, type Camera} from '../geo';
import {C, fontFamily, man} from '../theme';
import type {MapState} from '../timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const KIND: Record<string, {color: string; travel: number; r: number; bend: number}> = {
  air: {color: C.air, travel: 0.85, r: 2.6, bend: -0.06},
  us: {color: C.us, travel: 0.85, r: 3, bend: -0.1},
  sea: {color: C.sea_route, travel: 1.6, r: 3.4, bend: 0.08},
  feed: {color: C.feed, travel: 0.6, r: 2.8, bend: 0.18},
  land: {color: C.feed, travel: 0.45, r: 2.6, bend: 0.25},
  self: {color: C.self, travel: 0.9, r: 2.6, bend: -0.04},
  via: {color: C.via, travel: 0.7, r: 3, bend: 0.1},
  onward: {color: C.via, travel: 0.85, r: 2.6, bend: -0.08},
};
const PER_DOT: Record<'saki' | 'oki', number> = {saki: 90, oki: 420};

// その日の値（日の途中は前日と当日の間を補間）
const valuesAt = (run: Run, day: number) => {
  const d0 = Math.floor(day), d1 = Math.min(run.days.length - 1, d0 + 1), p = day - d0;
  const a = run.days[d0].v, b = run.days[d1].v;
  const out: Record<string, number> = {};
  for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * p;
  return out;
};

const Coast: React.FC<{cam: Camera}> = ({cam}) => (
  <>
    {Object.entries(COAST).map(([k, pts]) => (
      <polygon key={k}
        points={pts.map(([lng, lat]) => { const p = project(cam, lng, lat); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
        fill={C.land} stroke={C.landEdge} strokeWidth={1.2} strokeLinejoin="round" />
    ))}
  </>
);

// 経緯線。地図らしさと奥行きのために薄く引く
const Graticule: React.FC<{cam: Camera}> = ({cam}) => {
  const step = cam.span > 20 ? 5 : cam.span > 9 ? 2 : 1;
  const lines: React.ReactNode[] = [];
  for (let lng = Math.floor((cam.lng - cam.span) / step) * step; lng <= cam.lng + cam.span; lng += step) {
    const x = project(cam, lng, cam.lat).x;
    lines.push(<line key={`x${lng}`} x1={x} x2={x} y1={0} y2={H} stroke={C.grid} strokeWidth={1} />);
  }
  for (let lat = Math.floor((cam.lat - cam.span) / step) * step; lat <= cam.lat + cam.span; lat += step) {
    const y = project(cam, cam.lng, lat).y;
    lines.push(<line key={`y${lat}`} x1={0} x2={W} y1={y} y2={y} stroke={C.grid} strokeWidth={1} />);
  }
  return <>{lines}</>;
};

const Flows: React.FC<{run: Run; day: number; playing: number; cam: Camera}> = ({run, day, playing, cam}) => {
  if (playing <= 0) return null;
  const nodes = nodesOf(run);
  const per = PER_DOT[run.sim];
  const out: React.ReactNode[] = [];
  const lines: React.ReactNode[] = [];
  const dNow = Math.floor(day) + 1;
  for (let d = Math.max(1, dNow - 2); d <= Math.min(run.days.length - 1, dNow); d++) {
    for (const [fi, ti, amt, kind] of run.days[d].f) {
      const k = KIND[kind] ?? KIND.air;
      const n = Math.min(30, Math.round(amt / per));
      const a = nodes[fi], b = nodes[ti];
      const path = arc(project(cam, a.lng, a.lat), project(cam, b.lng, b.lat), k.bend);
      if (d === dNow && n > 0) lines.push(<path key={`l${fi}-${ti}-${kind}`} d={path.d} fill="none" stroke={k.color} strokeOpacity={0.13 * playing} strokeWidth={1.2} />);
      for (let j = 0; j < n; j++) {
        const spawn = d - 1 + j / n;
        const t = (day - spawn) / k.travel;
        if (t < 0 || t > 1) continue;
        const p = path.at(t);
        const o = interpolate(t, [0, 0.08, 0.85, 1], [0, 1, 1, 0]) * playing;
        out.push(<circle key={`${d}-${fi}-${ti}-${kind}-${j}`} cx={p.x} cy={p.y} r={k.r} fill={k.color} opacity={o} />);
      }
    }
  }
  return <><g>{lines}</g><g filter="url(#glow)">{out}</g></>;
};

// 人の量を表す円。島ごと（本島は集結圏ごと）に、残っている人の平方根に比例
const radius = (n: number, k: number) => (2.5 + Math.sqrt(Math.max(0, n)) * 0.075) * k;
const SKIP_LABEL = new Set(['nanbu', 'chubu', 'hokubu', 'shimoji', 'ikema', 'kurima', 'irabu', 'ogami', 'minna', 'aragusuku', 'yubu', 'hatoma', 'kuroshima', 'taketomi', 'kohama',
  'tsuken', 'kudaka', 'minnamotobu', 'tonaki', 'aguni', 'izena', 'iheya', 'zamami', 'tokashiki', 'kitadaito', 'ie']);

const People: React.FC<{state: MapState; frame: number; cam: Camera; attack: boolean; hl: string | null}> = ({state, frame, cam, attack, hl}) => {
  const run = RUNS[state.run];
  const nodes = nodesOf(run);
  const idx = nodeIndex(run);
  let vals = valuesAt(run, state.day);
  // 条件を切り替えた直後は、前の状態から滑らかに移す
  const sw = interpolate(frame - state.switchAt, [0, 18], [0, 1], clamp);
  if (sw < 1 && RUNS[state.prevRun].sim === run.sim) {
    const pv = valuesAt(RUNS[state.prevRun], state.prevDay);
    vals = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, (pv[k] ?? v) + (v - (pv[k] ?? v)) * sw]));
  }
  const init = run.days[0].v;
  const k = Math.pow(8 / cam.span, 0.55);
  const labels = interpolate(cam.span, [9, 14], [1, 0], clamp);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);
  return (
    <>
      {Object.keys(init).map((key) => {
        const i = idx[key];
        if (i === undefined) return null;
        const nd = nodes[i];
        const p = project(cam, nd.lng, nd.lat);
        const v = vals[key];
        if (key === 'naha' || key === 'hub-OKA') {
          // 那覇に足止めされた人（経由の滞留）
          if (v < 50) return null;
          return <circle key={key} cx={p.x} cy={p.y} r={radius(v, k)} fill="rgba(255,177,94,0.35)" stroke={C.via} strokeWidth={2} />;
        }
        const r = radius(v, k), r0 = radius(init[key], k);
        const empty = v < 1;
        const col = empty ? C.done : attack ? C.attack : C.people;
        return (
          <g key={key}>
            {init[key] > 0 && <circle cx={p.x} cy={p.y} r={r0} fill="none" stroke={col} strokeOpacity={0.3} strokeDasharray="3 4" />}
            {init[key] > 0 && <circle cx={p.x} cy={p.y} r={Math.max(r, empty ? 3 * k : 0)} fill={col} fillOpacity={empty ? 0.25 : 0.45} stroke={col} strokeWidth={1.4} filter="url(#glow)" />}
            {!SKIP_LABEL.has(key) && init[key] > 0 && (
              <text x={p.x + r0 + 6} y={p.y + 7} fontSize={20} fill={C.sub} opacity={labels} fontFamily={fontFamily} fontWeight={700}
                stroke={C.bg} strokeWidth={4} paintOrder="stroke">{nd.n}</text>
            )}
            {hl === 'feed' && !['ishigaki', 'miyako'].includes(key) && nd.key in idx && !key.startsWith('hub') && run.sim === 'saki' && init[key] > 0 && (
              <circle cx={p.x} cy={p.y} r={r0 + 6 + pulse * 6} fill="none" stroke={C.feed} strokeOpacity={0.6 * (1 - pulse)} strokeWidth={2} />
            )}
            {hl === 'land' && ['nanbu', 'chubu', 'hokubu'].includes(key) && (
              <circle cx={p.x} cy={p.y} r={r0 + 6 + pulse * 10} fill="none" stroke={C.feed} strokeOpacity={0.7 * (1 - pulse)} strokeWidth={2.5} />
            )}
          </g>
        );
      })}
    </>
  );
};

// 出発の拠点（空港）と受入空港・港
const Places: React.FC<{run: Run; cam: Camera; frame: number; hl: string | null}> = ({run, cam, frame, hl}) => {
  const nodes = nodesOf(run);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  const far = interpolate(cam.span, [12, 20], [0, 1], clamp);
  const aps = new Set(run.aps.map((a) => `ap-${a}`));
  const BIG = new Set(['ap-fukuoka', 'ap-kagoshima', 'ap-kansai', 'ap-haneda', 'ap-chubu', 'ap-hiroshima']);
  return (
    <>
      {nodes.map((nd) => {
        const p = project(cam, nd.lng, nd.lat);
        if (nd.key.startsWith('hub-') || nd.key === 'kadena') {
          const col = nd.key === 'kadena' ? C.us : C.air;
          return (
            <g key={nd.key}>
              <rect x={p.x - 6} y={p.y - 6} width={12} height={12} fill={col} transform={`rotate(45 ${p.x} ${p.y})`} />
              {hl === 'hubs' && <circle cx={p.x} cy={p.y} r={14 + pulse * 14} fill="none" stroke={col} strokeOpacity={0.8 * (1 - pulse)} strokeWidth={2.5} />}
              {hl === 'hubs' && (
                <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize={24} fill={col} fontFamily={fontFamily} fontWeight={900} stroke={C.bg} strokeWidth={5} paintOrder="stroke">
                  {nd.key === 'kadena' ? '嘉手納' : nd.n.replace('（那覇）', '').replace('沖縄本島', '那覇')}
                </text>
              )}
            </g>
          );
        }
        if (aps.has(nd.key)) {
          return (
            <g key={nd.key}>
              <circle cx={p.x} cy={p.y} r={4.5} fill={C.dest} fillOpacity={0.9} />
              {BIG.has(nd.key) && <text x={p.x + 10} y={p.y + 6} fontSize={20} fill={C.sub} opacity={far} fontFamily={fontFamily} fontWeight={700}
                stroke={C.bg} strokeWidth={4} paintOrder="stroke">{nd.n}</text>}
            </g>
          );
        }
        if (nd.key.startsWith('sp-') || nd.key === 'kagoport') {
          return <rect key={nd.key} x={p.x - 4} y={p.y - 4} width={8} height={8} fill={C.sea_route} />;
        }
        return null;
      })}
    </>
  );
};

export const MapLayer: React.FC<{state: MapState; frame: number; cam: Camera; hl: string | null}> = ({state, frame, cam, hl}) => {
  const run = RUNS[state.run];
  const attack = state.day >= run.sum.warn && run.sim === 'oki';
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 35% 45%, ${C.seaGlow} 0%, ${C.sea} 55%, ${C.bg} 100%)`}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <Graticule cam={cam} />
        <Coast cam={cam} />
        <Places run={run} cam={cam} frame={frame} hl={hl} />
        <Flows run={run} day={state.day} playing={state.playing} cam={cam} />
        <People state={state} frame={frame} cam={cam} attack={attack} hl={hl} />
      </svg>
    </AbsoluteFill>
  );
};

export const totalsAt = (state: MapState) => {
  const run = RUNS[state.run];
  const d0 = Math.floor(state.day), d1 = Math.min(run.days.length - 1, d0 + 1), p = state.day - d0;
  const a = run.days[d0].t, b = run.days[d1].t;
  const mix = (x: number, y: number) => x + (y - x) * p;
  return {remaining: mix(a.remaining, b.remaining), inSaki: mix(a.inSaki, b.inSaki), naha: mix(a.naha, b.naha), run};
};
export {man};
