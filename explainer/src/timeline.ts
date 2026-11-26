// 台本（episode.json）と音声の長さ（voice.json）から、全体の時間割と各時点の画面の状態を作る
import EP from '../script/episode.json';
import VOICE from './data/voice.json';
import {CAMS, lerpCam, type Camera} from './geo';
import {RUNS} from './data';

export const FPS = 30;
const LEAD = 30; // 冒頭の間
const GAP_SAME = 7; // 同じ人が続けて話すときの間
const GAP_SWITCH = 12; // 話し手が替わるときの間
const TAIL = 90;

export type Panel = {kind: string; [k: string]: unknown} | null;
type Cue = {sec?: string; cam?: string; run?: string; play?: [number, number]; span?: number; day?: number; panel?: Panel; hl?: string | null; upto?: number};
type Entry = {id?: string; who?: 'z' | 't'; text?: string; sub?: string; cue?: Cue; pause?: number};
const VO = VOICE as Record<string, {dur: number; env: number[]}>;

export type Line = {id: string; who: 'z' | 't'; text: string; from: number; dur: number; env: number[]; cue: Cue};
export const LINES: Line[] = [];
{
  let t = LEAD, prev: string | null = null;
  for (const e of EP as Entry[]) {
    if (e.pause) { t += e.pause; continue; }
    const v = VO[e.id!];
    if (!v) throw new Error(`音声がありません: ${e.id}（scripts/make-voices.py を実行）`);
    if (prev) t += prev === e.who ? GAP_SAME : GAP_SWITCH;
    const dur = Math.ceil(v.dur * FPS);
    LINES.push({id: e.id!, who: e.who!, text: e.sub ?? e.text!, from: t, dur, env: v.env, cue: e.cue ?? {}});
    t += dur;
    prev = e.who!;
  }
}
export const TOTAL = LINES[LINES.length - 1].from + LINES[LINES.length - 1].dur + TAIL;
const end = (i: number) => (i + 1 < LINES.length ? LINES[i + 1].from : TOTAL);

// ── 各台詞の時点で有効な状態（cue は次に変わるまで持ち越す）
type State = {sec: string; cam: string; run: string; panel: Panel; panelAt: number; hl: string | null; upto: number};
const STATES: State[] = [];
{
  let s: State = {sec: '', cam: 'japan', run: 's_kyushu', panel: null, panelAt: 0, hl: null, upto: 0};
  LINES.forEach((l) => {
    const c = l.cue;
    s = {...s};
    if (c.sec !== undefined) s.sec = c.sec;
    if (c.cam) s.cam = c.cam;
    if (c.run) s.run = c.run;
    if (c.panel !== undefined) { s.panel = c.panel; s.panelAt = l.from; }
    if (c.hl !== undefined) s.hl = c.hl;
    if (c.upto !== undefined) s.upto = c.upto;
    if (c.panel && (c.panel as {upto?: number}).upto !== undefined) s.upto = (c.panel as unknown as {upto: number}).upto;
    STATES.push(s);
  });
}

// ── 地図の日付の動き。play は台詞の頭から span 本ぶんの終わりまで、日を一定の速さで進める
type Seg = {from: number; to: number; run: string; d0: number; d1: number};
const SEGS: Seg[] = [];
{
  let run = 's_kyushu', day = 0;
  LINES.forEach((l, i) => {
    const c = l.cue;
    if (c.run) run = c.run;
    if (c.day !== undefined) { day = c.day; SEGS.push({from: l.from, to: l.from, run, d0: day, d1: day}); }
    if (c.play) {
      const last = Math.min(LINES.length - 1, i + (c.span ?? 1) - 1);
      const to = LINES[last].from + LINES[last].dur;
      SEGS.push({from: l.from, to, run, d0: c.play[0], d1: c.play[1]});
      day = c.play[1];
    } else if (c.run && c.day === undefined) {
      SEGS.push({from: l.from, to: l.from, run, d0: day, d1: day});
    }
  });
}
const maxDay = (run: string) => RUNS[run].days.length - 1;

export type MapState = {run: string; day: number; playing: number; switchAt: number; prevRun: string; prevDay: number};
export const mapAt = (f: number): MapState => {
  let k = -1;
  for (let i = 0; i < SEGS.length; i++) if (SEGS[i].from <= f) k = i;
  if (k < 0) return {run: SEGS[0]?.run ?? 's_kyushu', day: 0, playing: 0, switchAt: -999, prevRun: 's_kyushu', prevDay: 0};
  const s = SEGS[k];
  const p = s.to > s.from ? Math.min(1, (f - s.from) / (s.to - s.from)) : 1;
  const day = Math.min(maxDay(s.run), s.d0 + (s.d1 - s.d0) * p);
  // 再生中かどうか（流れの点を出すか）。区間の終わりの少し後まで残光を出す
  const playing = s.to > s.from ? (f <= s.to ? 1 : Math.max(0, 1 - (f - s.to) / 25)) : 0;
  // 条件を切り替えた瞬間を探す（円の大きさを滑らかにつなぐため）
  let sw = -999, prevRun = s.run, prevDay = day;
  for (let i = k; i > 0; i--) {
    if (SEGS[i].run !== SEGS[i - 1].run || SEGS[i].d0 !== SEGS[i - 1].d1) {
      sw = SEGS[i].from; prevRun = SEGS[i - 1].run; prevDay = Math.min(maxDay(prevRun), SEGS[i - 1].d1);
      break;
    }
  }
  return {run: s.run, day, playing, switchAt: sw, prevRun, prevDay};
};

const lineIndexAt = (f: number) => {
  let k = 0;
  for (let i = 0; i < LINES.length; i++) if (LINES[i].from <= f) k = i;
  return k;
};
export const stateAt = (f: number) => {
  const i = lineIndexAt(f);
  return {...STATES[i], line: LINES[i], lineIndex: i, lineEnd: end(i), prev: i > 0 ? STATES[i - 1] : STATES[0]};
};

// ── カメラ：切り替わりは1.3秒かけて移り、止まっている間もわずかに漂う
const CAM_MOVE = 40;
export const cameraAt = (f: number): Camera => {
  const i = lineIndexAt(f);
  const cur = STATES[i].cam;
  let j = i;
  while (j > 0 && STATES[j - 1].cam === cur) j--;
  const startF = LINES[j].from;
  const from = j > 0 ? STATES[j - 1].cam : cur;
  const raw = Math.min(1, Math.max(0, (f - startF) / CAM_MOVE));
  const t = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2;
  const base = lerpCam(CAMS[from], CAMS[cur], t);
  const drift = Math.sin(f / 240) * 0.012 * base.span;
  return {lng: base.lng + drift, lat: base.lat + Math.cos(f / 300) * 0.006 * base.span, span: base.span * (1 + Math.sin(f / 420) * 0.012)};
};
