// index.html のモデル部分をそのまま切り出して実行し、動画用のJSONを書き出す。
// 使い方: node scripts/export-sim.mjs  （モデルを変えたら再実行する）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const html = fs.readFileSync(path.resolve(import.meta.dirname, '../../index.html'), 'utf8');
const start = html.indexOf('/* ===== 対象地域 =====');
const end = html.indexOf('function addCoast(map)');
if (start < 0 || end < 0) throw new Error('index.html のモデル部分が見つかりません');
let model = html.slice(start, end);
// 日ごとのスナップショットに「まだ自宅側にいる人数（home）」を足す。描画で、島に残る人と拠点で待つ人を分けるため
const SNAP = 'left:Object.fromEntries(U.map(u=>[u.id,home(u)+hub(u)])),';
if (!model.includes(SNAP)) throw new Error('snap() の形が変わっています');
model = model.replace(SNAP, SNAP + 'home:Object.fromEntries(U.map(u=>[u.id,home(u)])),');
// シナリオ定義（悲観・中間・楽観）は画面描画の後ろにあるので、別に切り出して足す
const s0 = html.indexOf('/* ===== シナリオ =====');
const s1 = html.indexOf('let CURSCEN=null;');
if (s0 < 0 || s1 < 0) throw new Error('シナリオ定義が見つかりません');
model += html.slice(s0, s1);

const code = model + `
;globalThis.__out = (() => {
  const scenarios = {};
  for (const key of ['pess', 'mid', 'opt']) {
    const P = {...BASE_PAR, ...SCEN[key].par};
    const R = simulate(P);
    const A = R.A;
    const last = R.allDay ?? R.frames.length - 1;
    // 日ごとの輸送力の内訳（流れの描き分けに使う）
    const caps = R.frames.slice(0, last + 1).map((f, d) => {
      if (d === 0) return null;
      const prev = R.frames[d - 1];
      const C = dayCaps(A, prev.deployLeft > 0, d > P.warn, P, d,
        {OKA: prev.q.OKA + prev.inOka * 0.4, MYK: prev.q.MYK, ISG: prev.q.ISG});
      const r = x => Math.round(x * 1000) / 1000;
      const seaShare = {}, usShare = r(C.pax.OKA > 0 ? C.usPax / C.pax.OKA : 0);
      HUBIDS.forEach(h => { const t = C.pax[h] + C.sea[h]; seaShare[h] = r(t > 0 ? C.sea[h] / t : 0); });
      const apTot = Object.values(C.apUse).reduce((s, x) => s + x, 0) || 1;
      const apShare = Object.fromEntries(Object.entries(C.apUse).map(([k, v]) => [k, r(v / apTot)]));
      return {seaShare, usShare, apShare, g: C.g};
    });
    const rr = x => Math.round(x);
    scenarios[key] = {
      key, name: SCEN[key].name, par: P, destName: A.destName, destCap: A.destCap,
      frames: R.frames.slice(0, last + 1).map(f => ({
        day: f.day, left: Object.fromEntries(Object.entries(f.left).map(([k, v]) => [k, rr(v)])),
        home: Object.fromEntries(Object.entries(f.home).map(([k, v]) => [k, rr(v)])),
        q: {OKA: rr(f.q.OKA), MYK: rr(f.q.MYK), ISG: rr(f.q.ISG)},
        inSaki: rr(f.inSaki), inOka: rr(f.inOka), remaining: rr(f.remaining), arrived: rr(f.arrived),
      })),
      rem: R.rem.map(rr), caps,
      target: R.target, residents: R.residents, tourists: R.tourists, sakiTarget: R.sakiTarget,
      selfOut: R.selfOut, selfRes: R.selfRes, atWar: R.atWar, eff: R.eff,
      sakiDay: R.sakiDay, okaDay: R.okaDay, allDay: R.allDay, feederDone: R.feederDone, deployDone: R.deployDone,
    };
  }
  return {
    geo: {islands: ISLANDS, hubs: HUBS, bases: BASES, seaPorts: SEA_PORTS, airports: KYUSHU_AP, coast: COAST},
    scenarios,
  };
})();`;

const ctx = {Math, Object, Array, JSON, Number, Infinity};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const out = path.resolve(import.meta.dirname, '../src/data/sim.json');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(ctx.__out));
for (const s of Object.values(ctx.__out.scenarios)) {
  console.log(s.key, s.name, {target: s.target, residents: s.residents, tourists: s.tourists, saki: s.sakiTarget,
    start: s.par.startDelay, warn: s.par.warn, atWar: Math.round(s.atWar), sakiDay: s.sakiDay, okaDay: s.okaDay,
    allDay: s.allDay, eff: Math.round(s.eff), frames: s.frames.length, rem: s.rem.length, selfOut: Math.round(s.selfOut), selfRes: Math.round(s.selfRes)});
}
const m = ctx.__out.scenarios.mid;
console.log(m.frames.filter((f, i) => i % 3 === 0).map(f => `${f.day}:${Math.round(f.remaining / 1000)}k/${Math.round(f.inSaki / 1000)}k`).join(' '));
console.log(JSON.stringify(m.caps[10]), JSON.stringify(m.caps[30]));
