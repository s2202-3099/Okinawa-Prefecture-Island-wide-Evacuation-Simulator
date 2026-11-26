// 尺はナレーションの長さから決める。音声を差し替えて narration.json を測り直せば、動画の尺も追従する
import NARR from './data/narration.json';
import {SCN} from './data';

export const FPS = 30;
const f = (sec: number) => Math.ceil(sec * FPS);
export const N = Object.fromEntries(Object.entries(NARR).map(([k, v]) => [k, f(v)])) as Record<keyof typeof NARR, number>;
type NKey = keyof typeof N;

const S = SCN.mid;
export const START = S.par.startDelay; // 7：公的輸送が始まる前日まで
export const WARN = S.par.warn; // 25：攻撃開始
export const LAST = S.allDay ?? S.frames.length - 1; // 51：県内が空になる日

// ── 地図シーンの区切り。日を進める区間と、日を止めて語る区間を並べる
type Seg =
  | {kind: 'intro'; key: NKey; min: number}
  | {kind: 'days'; key: NKey; from: number; to: number; minDay: number}
  | {kind: 'hold'; key: NKey; day: number; min: number};
const SEGS: Seg[] = [
  {kind: 'intro', key: 'introA', min: 150},
  {kind: 'intro', key: 'introB', min: 150},
  {kind: 'days', key: 'days1', from: 1, to: START, minDay: 30},
  {kind: 'days', key: 'days8', from: START + 1, to: WARN, minDay: 22},
  {kind: 'hold', key: 'attack', day: WARN, min: 150},
  {kind: 'days', key: 'days26', from: WARN + 1, to: LAST, minDay: 16},
  {kind: 'hold', key: 'days26', day: LAST, min: 75}, // 余韻（音声はひとつ前の区間で鳴り終わる）
];
const PAD = 8; // 区間の頭からナレーションが入るまで
const segLen = (s: Seg, i: number) => {
  const voice = i === SEGS.length - 1 ? 0 : PAD + N[s.key] + 24;
  if (s.kind === 'days') return Math.max((s.to - s.from + 1) * s.minDay, voice);
  return Math.max(s.min, voice);
};
const LENS = SEGS.map(segLen);
const STARTS = LENS.map((_, i) => LENS.slice(0, i).reduce((a, b) => a + b, 0));
export const MAP_SCENE_LEN = LENS.reduce((a, b) => a + b, 0);
export const segStart = (key: NKey, kind?: Seg['kind']) =>
  STARTS[SEGS.findIndex((s) => s.key === key && (!kind || s.kind === kind))];
export const INTRO_A = LENS[0];
export const INTRO = LENS[0] + LENS[1];
export const ATTACK_FROM = segStart('attack');
export const ATTACK_LEN = LENS[SEGS.findIndex((s) => s.key === 'attack')];
export const END_HOLD_FROM = STARTS[STARTS.length - 1];

// d 日目が始まるフレーム
export const dayStart = (d: number) => {
  const i = SEGS.findIndex((s) => s.kind === 'days' && d >= s.from && d <= s.to);
  if (i < 0) return d < 1 ? INTRO : MAP_SCENE_LEN;
  const s = SEGS[i] as Extract<Seg, {kind: 'days'}>;
  return STARTS[i] + ((d - s.from) * LENS[i]) / (s.to - s.from + 1);
};
export const dayLen = (d: number) => {
  const i = SEGS.findIndex((s) => s.kind === 'days' && d >= s.from && d <= s.to);
  const s = SEGS[i] as Extract<Seg, {kind: 'days'}>;
  return LENS[i] / (s.to - s.from + 1);
};

// フレーム → 何日目か（d）と、その日の進み具合（p: 0〜1）
export const dayAt = (frame: number): {d: number; p: number} => {
  for (let i = SEGS.length - 1; i >= 0; i--) {
    if (frame < STARTS[i]) continue;
    const s = SEGS[i];
    if (s.kind === 'intro') return {d: 0, p: 0};
    if (s.kind === 'hold') return {d: s.day, p: 1};
    const len = LENS[i] / (s.to - s.from + 1);
    const k = Math.min(s.to - s.from, Math.floor((frame - STARTS[i]) / len));
    return {d: s.from + k, p: Math.min(1, (frame - STARTS[i] - k * len) / len)};
  }
  return {d: 0, p: 0};
};

// ── 解説・教訓・政策のシーン。ナレーションを数本に分け、絵の切り替えをその頭に合わせる
const CLIP_GAP = 14; // ナレーションとナレーションの間
const CLIP_LEAD = 15; // シーン頭からの入り
const CLIP_TAIL = 45; // 最後のナレーションの後の余韻
export const CLIPS = {
  about1: ['about1'],
  about2: ['about2_0', 'about2_1', 'about2_2', 'about2_3'],
  about3: ['about3_0', 'about3_1'],
  lessons: ['lessons'],
  policy: ['policy0', 'policy1', 'policy2', 'policy3', 'policy4'],
} as const satisfies Record<string, readonly NKey[]>;
type ClipScene = keyof typeof CLIPS;
export const clipStarts = (scene: ClipScene) => {
  const out: number[] = [];
  let t = CLIP_LEAD;
  for (const k of CLIPS[scene]) { out.push(t); t += N[k] + CLIP_GAP; }
  return out;
};
const clipSceneLen = (scene: ClipScene) => {
  const st = clipStarts(scene), ks = CLIPS[scene];
  return st[st.length - 1] + N[ks[ks.length - 1]] + CLIP_TAIL;
};

// ── シーンの並び
export const TITLE_LEN = Math.max(150, 15 + N.title + 30);
export const ABOUT1_LEN = clipSceneLen('about1');
export const ABOUT2_LEN = clipSceneLen('about2');
export const ABOUT3_LEN = clipSceneLen('about3');
export const CHART_LEN = Math.max(480, 15 + N.chart + 90);
export const LESSONS_LEN = clipSceneLen('lessons');
export const POLICY_LEN = clipSceneLen('policy') + 30;
export const CLOSING_LEN = Math.max(240, 10 + N.closing + 120);

export const ABOUT1_FROM = TITLE_LEN;
export const ABOUT2_FROM = ABOUT1_FROM + ABOUT1_LEN;
export const ABOUT3_FROM = ABOUT2_FROM + ABOUT2_LEN;
export const MAP_FROM = ABOUT3_FROM + ABOUT3_LEN;
export const CHART_FROM = MAP_FROM + MAP_SCENE_LEN;
export const LESSONS_FROM = CHART_FROM + CHART_LEN;
export const POLICY_FROM = LESSONS_FROM + LESSONS_LEN;
export const CLOSING_FROM = POLICY_FROM + POLICY_LEN;
export const TOTAL_LEN = CLOSING_FROM + CLOSING_LEN;
