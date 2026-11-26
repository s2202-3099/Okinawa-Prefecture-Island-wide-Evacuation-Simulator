import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {GEO, SCN, type HubId, type Island} from '../data';
import {arc, cameraAt, H, project, W, type Camera} from '../geo';
import {C, fmt, fontFamily, man} from '../theme';
import {
  ATTACK_FROM, ATTACK_LEN, dayAt, dayLen, dayStart, END_HOLD_FROM, INTRO, INTRO_A, LAST,
  MAP_SCENE_LEN, START, WARN,
} from '../timing';

const S = SCN.mid;
const HUBS: HubId[] = ['OKA', 'MYK', 'ISG'];
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.33, 0, 0.2, 1);

// ── カメラ。PREF＝沖縄県全域、JAPAN＝受入空港まで入る広域
const PREF: Camera = {lng: 127.3, lat: 25.3, span: 11};
const JAPAN: Camera = {lng: 130.5, lat: 30.6, span: 28};
const d8 = dayStart(START + 1);
const CAM_KEYS: [number, Camera][] = [
  [0, JAPAN],
  [40, JAPAN],
  [120, PREF],
  [d8 - 10, PREF],
  [d8 + 60, JAPAN],
  [ATTACK_FROM, JAPAN],
  [ATTACK_FROM + 50, PREF],
  [ATTACK_FROM + ATTACK_LEN - 20, PREF],
  [ATTACK_FROM + ATTACK_LEN + 40, JAPAN],
];

// その時点の値を、前日→当日の間で補間して返す
const tween = (frame: number, pick: (d: number) => number) => {
  const {d, p} = dayAt(frame);
  if (d === 0) return pick(0);
  return pick(d - 1) + (pick(d) - pick(d - 1)) * ease(p);
};

const isHubLike = (i: Island) => i.type === 'hub' || i.type === 'bridge';
const byId = Object.fromEntries(GEO.airports.map((a) => [a.id, a]));
const KADENA = GEO.bases.kadena;
const SELF_DEST = [
  {ap: byId.haneda, w: 0.45}, {ap: byId.itami, w: 0.25}, {ap: byId.fukuoka, w: 0.3},
];

// ── 1日ごとの流れ（地図上の点の元になる）
type Pt = {lat: number; lng: number};
type Flow = {key: string; from: Pt; to: Pt; amount: number; color: string; travel: number; bend: number; r: number; dash?: boolean};
const hubPt = (h: HubId): Pt => GEO.hubs[h];
const portPt = (h: HubId): Pt => ({lat: GEO.hubs[h].port[0], lng: GEO.hubs[h].port[1]});
const outOf = (d: number, h: HubId) => {
  const prev = S.frames[d - 1], cur = S.frames[d];
  return GEO.islands.filter((i) => i.hub === h).reduce((s, i) => s + prev.left[i.id] - cur.left[i.id], 0);
};
const flowsOfDay = (d: number): Flow[] => {
  const prev = S.frames[d - 1], cur = S.frames[d];
  const out: Flow[] = [];
  if (d <= START) {
    // 公示前：定期便で観光客と一部住民が自力で出る
    for (const h of HUBS) {
      const amt = outOf(d, h);
      for (const {ap, w} of SELF_DEST) {
        out.push({key: `self-${h}-${ap.id}`, from: hubPt(h), to: ap, amount: amt * w,
          color: C.self, travel: 56, bend: -0.05, r: 4});
      }
    }
    return out;
  }
  const caps = S.caps[d]!;
  // 第1層：本島の集結圏 → 那覇（バス）
  for (const i of GEO.islands.filter((x) => x.type === 'main')) {
    const amt = prev.home[i.id] - cur.home[i.id];
    if (amt > 1) out.push({key: `land-${i.id}`, from: i, to: hubPt('OKA'), amount: amt,
      color: C.island, travel: 20, bend: 0.2, r: 3});
  }
  // 第2層：離島 → 拠点島
  for (const i of GEO.islands.filter((x) => x.type !== 'main' && !isHubLike(x))) {
    const amt = prev.home[i.id] - cur.home[i.id];
    if (amt > 1) out.push({key: `feed-${i.id}`, from: i, to: hubPt(i.hub), amount: amt,
      color: C.island, travel: 26, bend: 0.15, r: 3.5, dash: true});
  }
  // 第3層：拠点島 → 本土（空路は受入空港の使われ方で配分、海路は九州の4港へ）
  const shareTot = GEO.seaPorts.reduce((s, p) => s + p.share, 0);
  for (const h of HUBS) {
    const amt = outOf(d, h);
    if (amt <= 1) continue;
    const sea = amt * caps.seaShare[h];
    for (const p of GEO.seaPorts) {
      out.push({key: `sea-${h}-${p.n}`, from: portPt(h), to: p, amount: (sea * p.share) / shareTot,
        color: C.sea_route, travel: 100, bend: 0.08, r: 4.5, dash: true});
    }
    const air = amt - sea;
    const us = h === 'OKA' ? air * caps.usShare : 0;
    for (const [id, w] of Object.entries(caps.apShare)) {
      const ap = byId[id];
      out.push({key: `air-${h}-${id}`, from: hubPt(h), to: ap, amount: (air - us) * w,
        color: C.air, travel: 52, bend: -0.05, r: 3});
      if (us > 0) out.push({key: `us-${id}`, from: KADENA, to: ap, amount: us * w,
        color: C.naha, travel: 52, bend: -0.09, r: 3.5});
    }
  }
  return out;
};
const FLOWS = Array.from({length: LAST}, (_, i) => flowsOfDay(i + 1));
const PER_DOT = 380; // 点1つ＝およそ380人

const Dots: React.FC<{frame: number; cam: Camera}> = ({frame, cam}) => {
  const dots: React.ReactNode[] = [];
  FLOWS.forEach((flows, idx) => {
    const d = idx + 1, ds = dayStart(d), len = dayLen(d);
    if (frame < ds || frame > ds + len + 110) return;
    for (const f of flows) {
      const n = Math.min(24, Math.round(f.amount / PER_DOT));
      if (n <= 0) continue;
      const path = arc(project(cam, f.from.lng, f.from.lat), project(cam, f.to.lng, f.to.lat), f.bend);
      for (let k = 0; k < n; k++) {
        const t = (frame - (ds + (k * len) / n)) / f.travel;
        if (t < 0 || t > 1) continue;
        const p = path.at(ease(t));
        const o = interpolate(t, [0, 0.08, 0.85, 1], [0, 0.9, 0.9, 0]);
        dots.push(<circle key={`${f.key}-${d}-${k}`} cx={p.x} cy={p.y} r={f.r} fill={f.color} opacity={o} />);
      }
    }
  });
  return <>{dots}</>;
};

// 道筋の線。その日に動いている経路だけ濃く
const ALL_FLOWS = new Map<string, Flow>();
FLOWS.flat().forEach((f) => { if (f.amount > PER_DOT / 2) ALL_FLOWS.set(f.key, f); });
const Routes: React.FC<{frame: number; cam: Camera}> = ({frame, cam}) => {
  if (frame < INTRO - 20) return null;
  const d = Math.max(1, dayAt(frame).d);
  const fadeIn = interpolate(frame, [INTRO - 20, INTRO + 10], [0, 1], clamp);
  const active = new Set(FLOWS[d - 1].filter((f) => f.amount > PER_DOT / 2).map((f) => f.key));
  return (
    <g opacity={fadeIn}>
      {[...ALL_FLOWS.values()].map((f) => {
        const on = active.has(f.key);
        const path = arc(project(cam, f.from.lng, f.from.lat), project(cam, f.to.lng, f.to.lat), f.bend);
        return (
          <path key={f.key} d={path.d} fill="none" stroke={f.color}
            strokeWidth={on ? 1.3 : 0.8} strokeOpacity={on ? 0.28 : 0.06}
            strokeDasharray={f.dash ? '5 6' : undefined} />
        );
      })}
    </g>
  );
};

const Coast: React.FC<{cam: Camera}> = ({cam}) => (
  <>
    {Object.entries(GEO.coast).map(([k, pts]) => (
      <polygon key={k}
        points={pts.map(([lng, lat]) => { const p = project(cam, lng, lat); return `${p.x},${p.y}`; }).join(' ')}
        fill={C.land} stroke={C.coast} strokeWidth={1.2} strokeLinejoin="round" />
    ))}
  </>
);

const Label: React.FC<{x: number; y: number; children: React.ReactNode; size?: number;
  color?: string; opacity?: number; weight?: number; anchor?: 'start' | 'end' | 'middle'}> =
  ({x, y, children, size = 24, color = C.ink, opacity = 1, weight = 700, anchor = 'start'}) => (
    <text x={x} y={y} fontSize={size} fill={color} opacity={opacity} fontWeight={weight}
      textAnchor={anchor} dominantBaseline="middle" fontFamily={fontFamily}
      stroke={C.paper} strokeWidth={size / 5} paintOrder="stroke" strokeLinejoin="round">
      {children}
    </text>
  );

// 円の大きさ。人数の平方根に比例させ、ズームに合わせて少しだけ縮める
const radius = (n: number, k: number) => (3 + Math.sqrt(Math.max(0, n)) * 0.07) * k;
const valueOf = (i: Island, d: number) => {
  const f = S.frames[d];
  if (i.type === 'main') return f.left[i.id];
  if (i.type === 'hub') return f.q[i.hub];
  return f.home[i.id];
};
const NAMED = ['kume', 'minamidaito', 'yonaguni', 'iriomote'];

const Islands: React.FC<{frame: number; cam: Camera}> = ({frame, cam}) => {
  const k = Math.pow(PREF.span / cam.span, 0.6);
  const zoomLabel = interpolate(cam.span, [14, 18], [1, 0], clamp);
  const attack = frame >= ATTACK_FROM && frame < ATTACK_FROM + ATTACK_LEN;
  return (
    <>
      {GEO.islands.map((i, idx) => {
        const p = project(cam, i.lng, i.lat);
        const pop = interpolate(frame, [100 + idx * 2, 120 + idx * 2], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
        if (i.type === 'bridge') return <circle key={i.id} cx={p.x} cy={p.y} r={3 * k * pop} fill={C.island} opacity={0.6} />;
        const now = tween(frame, (d) => valueOf(i, d));
        const ring = radius(valueOf(i, 0), k) * pop;
        const r = radius(now, k) * pop;
        const emptied = now < 1;
        const col = emptied ? C.done : attack ? C.attack : C.island;
        return (
          <g key={i.id}>
            <circle cx={p.x} cy={p.y} r={ring} fill="none" stroke={C.island} strokeOpacity={0.35}
              strokeWidth={1.2} strokeDasharray="3 4" />
            <circle cx={p.x} cy={p.y} r={Math.max(r, emptied ? 4 * k * pop : 0)} fill={col}
              fillOpacity={emptied ? 0.3 : 0.5} stroke={col} strokeWidth={1.4} />
            {NAMED.includes(i.id) && <Label x={p.x + ring + 8} y={p.y} size={22} opacity={zoomLabel * pop}>{i.n}</Label>}
          </g>
        );
      })}
    </>
  );
};

// 合計の見出し（本島・宮古・八重山）
const GROUPS = [
  {label: '沖縄本島', at: {lat: 26.62, lng: 128.25}, sum: (d: number) => GEO.islands.filter((i) => i.type === 'main').reduce((s, i) => s + S.frames[d].left[i.id], 0)},
  {label: '宮古', at: {lat: 24.95, lng: 125.55}, sum: (d: number) => S.frames[d].q.MYK},
  {label: '石垣', at: {lat: 24.62, lng: 124.35}, sum: (d: number) => S.frames[d].q.ISG},
];
const GroupLabels: React.FC<{frame: number; cam: Camera}> = ({frame, cam}) => {
  const o = interpolate(cam.span, [14, 18], [1, 0], clamp) * interpolate(frame, [120, 150], [0, 1], clamp);
  const attack = frame >= ATTACK_FROM && frame < ATTACK_FROM + ATTACK_LEN;
  return (
    <>
      {GROUPS.map((g) => {
        const p = project(cam, g.at.lng, g.at.lat);
        const v = tween(frame, g.sum);
        return (
          <g key={g.label} opacity={o}>
            <Label x={p.x + 14} y={p.y - 18} size={30}>{g.label}</Label>
            <Label x={p.x + 14} y={p.y + 18} size={28} weight={900}
              color={v < 1 ? C.done : attack ? C.attack : C.island}>{v < 1 ? '退避完了' : `${man(v)}人`}</Label>
          </g>
        );
      })}
    </>
  );
};

const SLOTS: Record<HubId, string> = {OKA: '那覇 210便/日', MYK: '宮古・下地島 53便/日', ISG: '新石垣 40便/日'};
const Places: React.FC<{frame: number; cam: Camera}> = ({frame, cam}) => {
  const near = interpolate(cam.span, [14, 18], [1, 0], clamp);
  const far = 1 - near;
  const hubOn = interpolate(frame, [INTRO_A, INTRO_A + 20], [0, 1], clamp);
  const hubFocus = interpolate(frame, [INTRO_A, INTRO_A + 20, INTRO - 20, INTRO], [0, 1, 1, 0], clamp);
  const apOn = interpolate(frame, [d8, d8 + 30], [0, 1], clamp);
  const kd = project(cam, KADENA.lng, KADENA.lat);
  const usedAps = new Set(Object.keys(S.caps[START + 1]!.apShare));
  return (
    <>
      {HUBS.map((h) => {
        const p = project(cam, GEO.hubs[h].lng, GEO.hubs[h].lat);
        const pos = {OKA: {dx: -16, dy: 40, a: 'end'}, MYK: {dx: 16, dy: 44, a: 'start'}, ISG: {dx: -16, dy: -44, a: 'end'}}[h];
        return (
          <g key={h} opacity={hubOn}>
            <rect x={p.x - 7} y={p.y - 7} width={14} height={14} fill={C.ink} transform={`rotate(45 ${p.x} ${p.y})`} />
            <Label x={p.x + pos.dx} y={p.y + pos.dy} size={24} anchor={pos.a as 'start' | 'end'} opacity={hubFocus * near}>{SLOTS[h]}</Label>
          </g>
        );
      })}
      <g opacity={hubOn}>
        <rect x={kd.x - 6} y={kd.y - 6} width={12} height={12} fill={C.naha} transform={`rotate(45 ${kd.x} ${kd.y})`} />
        <Label x={kd.x + 80} y={kd.y + 40} size={22} color={C.naha} opacity={hubFocus * near}>嘉手納（2割を使用）</Label>
      </g>
      {GEO.airports.filter((a) => usedAps.has(a.id)).map((a) => {
        const p = project(cam, a.lng, a.lat);
        const big = ['fukuoka', 'kagoshima', 'kansai', 'haneda', 'chubu', 'hiroshima'].includes(a.id);
        return (
          <g key={a.id} opacity={apOn}>
            <circle cx={p.x} cy={p.y} r={3 + Math.sqrt(a.slots) * 0.9} fill={C.dest} fillOpacity={0.55} stroke={C.ink} strokeWidth={1} />
            {big && <Label x={p.x + 12} y={p.y} size={20} opacity={far}>{a.n}</Label>}
          </g>
        );
      })}
      {GEO.seaPorts.map((s) => {
        const p = project(cam, s.lng, s.lat);
        return <rect key={s.n} x={p.x - 5} y={p.y - 5} width={10} height={10} fill={C.sea_route} opacity={apOn * 0.8} />;
      })}
    </>
  );
};

// ── 見出し（段階ごとに切り替え）
const mainPop = GEO.islands.filter((i) => i.type === 'main').reduce((s, i) => s + i.pop, 0);
const sakiPop = GEO.islands.filter((i) => i.hub !== 'OKA').reduce((s, i) => s + i.pop, 0);
const outerPop = S.residents - mainPop - sakiPop;
type Phase = {from: number; to: number; head: string; sub: string; red?: boolean};
const PHASES: Phase[] = [
  {from: 0, to: INTRO_A, head: `住民${Math.round(S.residents / 1e4)}万人＋観光客${Math.round(S.tourists / 1e4)}万人`,
    sub: `沖縄本島${man(mainPop)}・周辺の離島${man(outerPop)}・先島${man(sakiPop)}`},
  {from: INTRO_A, to: INTRO, head: '島の外への出口は3つの空港',
    sub: '空港の駐機スポットで1日に出せる便数が決まる。嘉手納は2割を使う想定'},
  {from: INTRO, to: d8, head: `1〜${START}日目　輸送開始まで`,
    sub: '動くのは定期便だけ。観光客と一部の住民が自力で島を出る'},
  {from: d8, to: ATTACK_FROM, head: `${START + 1}〜${WARN}日目　全国24空港へ`,
    sub: `本島はバスで集結し、空と海で1日約${man(S.eff)}人。先島は優先され${S.sakiDay}日目に空になる`},
  {from: ATTACK_FROM, to: ATTACK_FROM + ATTACK_LEN, head: `${WARN}日目　攻撃開始`, red: true,
    sub: `県内に残るのは約${man(S.atWar)}人（${Math.round((S.atWar / S.target) * 100)}%）`},
  {from: ATTACK_FROM + ATTACK_LEN, to: END_HOLD_FROM, head: `${WARN + 1}〜${LAST}日目　輸送力は3分の1に`, red: true,
    sub: `攻撃後も運び続け、開戦${LAST - WARN}日後に県内が空になる`},
  {from: END_HOLD_FROM, to: MAP_SCENE_LEN, head: `${LAST}日目　県内が空に`,
    sub: `攻撃開始に間に合ったのは全体の${Math.round((1 - S.atWar / S.target) * 100)}%`},
];

const Caption: React.FC<{frame: number}> = ({frame}) => {
  const ph = PHASES.find((p) => frame >= p.from && frame < p.to) ?? PHASES[PHASES.length - 1];
  const lastOne = ph === PHASES[PHASES.length - 1];
  const o = interpolate(frame, [ph.from, ph.from + 14, ph.to - 10, ph.to], [0, 1, 1, lastOne ? 1 : 0], clamp);
  const y = interpolate(frame, [ph.from, ph.from + 18], [16, 0], {...clamp, easing: ease});
  return (
    <div style={{position: 'absolute', left: 90, top: 80, maxWidth: 900, opacity: o, translate: `0 ${y}px`,
      background: 'rgba(246,241,228,0.93)', padding: '24px 34px', borderLeft: `10px solid ${ph.red ? C.attack : C.island}`}}>
      <div style={{fontSize: 52, fontWeight: 900, color: ph.red ? C.attack : C.ink, lineHeight: 1.25}}>{ph.head}</div>
      <div style={{fontSize: 30, fontWeight: 400, color: C.sub, marginTop: 10, lineHeight: 1.5}}>{ph.sub}</div>
    </div>
  );
};

const Bar: React.FC<{label: string; now: number; init: number; color: string}> = ({label, now, init, color}) => (
  <div style={{marginTop: 12}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 24, color: C.sub}}>
      <span>{label}</span><span style={{fontWeight: 700, color: C.ink}}>{fmt(now)}人</span>
    </div>
    <div style={{height: 12, background: '#E2D8C3', marginTop: 4}}>
      <div style={{height: '100%', width: `${(now / init) * 100}%`, background: color}} />
    </div>
  </div>
);

const Panel: React.FC<{frame: number}> = ({frame}) => {
  const o = interpolate(frame, [INTRO - 30, INTRO], [0, 1], clamp);
  const day = dayAt(frame).d;
  const rem = tween(frame, (d) => S.frames[d].remaining);
  const oka = tween(frame, (d) => S.frames[d].inOka);
  const saki = tween(frame, (d) => S.frames[d].inSaki);
  const atk = frame >= ATTACK_FROM;
  const countdown = !atk ? `攻撃まで あと${WARN - day}日` : day <= WARN ? '攻撃開始' : `攻撃開始から${day - WARN}日`;
  return (
    <div style={{position: 'absolute', right: 90, bottom: 80, width: 500, opacity: o,
      background: 'rgba(246,241,228,0.95)', border: `2px solid ${atk ? C.attack : C.ink}`, padding: '22px 30px'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 10}}>
        <span style={{fontSize: 96, fontWeight: 900, color: C.ink, lineHeight: 1}}>{day}</span>
        <span style={{fontSize: 38, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap'}}>日目</span>
      </div>
      <div style={{display: 'inline-block', marginTop: 12, fontSize: 26, fontWeight: 900, color: atk ? C.paper : C.attack,
        background: atk ? C.attack : 'transparent', padding: '4px 14px', border: `2px solid ${C.attack}`}}>{countdown}</div>
      <div style={{fontSize: 26, color: C.sub, marginTop: 14}}>県内に残っている人</div>
      <div style={{fontSize: 60, fontWeight: 900, color: rem < 1 ? C.done : atk ? C.attack : C.island, lineHeight: 1.1}}>
        {fmt(rem)}<span style={{fontSize: 30, fontWeight: 700}}> 人</span>
      </div>
      <Bar label="沖縄本島・周辺離島" now={oka} init={S.frames[0].inOka} color={C.island} />
      <Bar label="先島" now={saki} init={S.frames[0].inSaki} color={C.island} />
      <div style={{display: 'flex', gap: 14, marginTop: 16, fontSize: 19, color: C.sub, flexWrap: 'wrap'}}>
        <span><Dot c={C.air} />空路</span>
        <span><Dot c={C.naha} />嘉手納</span>
        <span><Dot c={C.sea_route} />海路</span>
        <span><Dot c={C.island} />島内・島間</span>
        <span><Dot c={C.self} />定期便</span>
      </div>
    </div>
  );
};
const Dot: React.FC<{c: string}> = ({c}) => (
  <span style={{display: 'inline-block', width: 13, height: 13, borderRadius: 7, background: c, marginRight: 7, verticalAlign: 'middle'}} />
);

// 攻撃開始の瞬間：赤い縁取りが2回脈打ってから残る
const AttackFrame: React.FC<{frame: number}> = ({frame}) => {
  if (frame < ATTACK_FROM) return null;
  const t = frame - ATTACK_FROM;
  const pulse = t < 40 ? 0.5 + 0.5 * Math.sin((t / 40) * Math.PI * 4 - Math.PI / 2) : 1;
  const fade = interpolate(frame, [ATTACK_FROM + ATTACK_LEN - 10, ATTACK_FROM + ATTACK_LEN + 20], [1, 0.35], clamp);
  return <AbsoluteFill style={{boxShadow: `inset 0 0 0 14px ${C.attack}`, opacity: pulse * fade, pointerEvents: 'none'}} />;
};

export const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAM_KEYS);
  return (
    <AbsoluteFill style={{background: C.sea, fontFamily}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Coast cam={cam} />
        <Routes frame={frame} cam={cam} />
        <Places frame={frame} cam={cam} />
        <Dots frame={frame} cam={cam} />
        <Islands frame={frame} cam={cam} />
        <GroupLabels frame={frame} cam={cam} />
      </svg>
      <AttackFrame frame={frame} />
      <Caption frame={frame} />
      <Panel frame={frame} />
    </AbsoluteFill>
  );
};
