// 教訓・政策の根拠になる数字を、シミュレータのモデルから作る。
//  1. 中間シナリオから「打ち手」を1つずつ動かしたとき、攻撃開始時の県内残留がどれだけ減るか
//  2. モンテカルロと感度分析（PRCC）。乱数は種を固定して再現できるようにする
// 使い方: node scripts/export-insights.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const html = fs.readFileSync(path.resolve(import.meta.dirname, '../../index.html'), 'utf8');
const part = (a, b) => {
  const s = html.indexOf(a), e = html.indexOf(b);
  if (s < 0 || e < 0) throw new Error(`見つかりません: ${a}`);
  return html.slice(s, e);
};
const model = part('/* ===== 対象地域 =====', 'function addCoast(map)') + part('/* ===== シナリオ =====', 'let CURSCEN=null;');

// 再現できる乱数（mulberry32）
const seeded = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const M = Object.create(Math); M.random = seeded(20261126);

const code = model + `
;globalThis.__out = (() => {
  const mid = {...BASE_PAR, ...SCEN.mid.par};
  const run = (patch, hubPatch) => {
    const saved = JSON.parse(JSON.stringify(HUBS));
    if (hubPatch) hubPatch();
    const R = simulate({...mid, ...patch});
    Object.assign(HUBS.OKA, saved.OKA); Object.assign(HUBS.MYK, saved.MYK); Object.assign(HUBS.ISG, saved.ISG);
    return {atWar: Math.round(R.atWar), allDay: R.allDay, sakiDay: R.sakiDay, target: R.target, bind: R.bind,
      needShelter: Math.round(R.needShelter), destCap: R.A.destCap, shelterOver: Math.round(R.shelterOver)};
  };
  const base = run({});
  const levers = [
    {id: 'start3', label: '決心を3日早める', note: '着手 7日→4日', r: run({startDelay: mid.startDelay - 3})},
    {id: 'selfRes', label: '早めの自主避難を促す', note: '住民の自主避難 8%→18%', r: run({selfRes: 18})},
    {id: 'spots', label: '那覇の駐機スポットを3割増', note: '30→39スポット', r: run({}, () => { HUBS.OKA.spot = 39; })},
    {id: 'planes', label: '民間機の徴用を5割増やす', note: '110機→165機', r: run({planes: Math.round(mid.planes * 1.5)})},
    {id: 'us', label: '嘉手納の使用を3倍に', note: '20%→60%', r: run({usBases: 60})},
    {id: 'ships', label: '船舶の徴用率を5割増', note: '40%→60%', r: run({shipRate: 60})},
  ];
  Object.assign(PAR, mid); // モンテカルロは PAR を中心にばらつかせるので、中間シナリオを中心に据える
  const mc = monteCarlo(2000);
  return {
    base, levers: levers.map(l => ({...l, saved: base.atWar - l.r.atWar})),
    mc: {n: mc.n, pDone: mc.pDone, p10: Math.round(mc.p10), p50: Math.round(mc.p50), p90: Math.round(mc.p90), useRate: mc.sens.useRate,
      prcc: mc.sens.prcc.map(x => ({name: x.name, val: Math.round(x.val * 100) / 100})).sort((a, b) => Math.abs(b.val) - Math.abs(a.val))},
  };
})();`;
const ctx = {Math: M, Object, Array, JSON, Number, Infinity};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const out = path.resolve(import.meta.dirname, '../src/data/insights.json');
fs.writeFileSync(out, JSON.stringify(ctx.__out, null, 1));
const o = ctx.__out;
console.log('base', o.base);
for (const l of o.levers) console.log(l.label, l.note, '→ atWar', l.r.atWar, 'saved', l.saved, 'allDay', l.r.allDay);
console.log('MC', JSON.stringify({...o.mc, prcc: o.mc.prcc.slice(0, 8)}));
