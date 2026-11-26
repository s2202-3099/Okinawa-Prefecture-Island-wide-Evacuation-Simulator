// 2つのシミュレータ（先島版・全県版）を条件を変えて回し、動画用の共通形式で書き出す。
//   node scripts/export-runs.mjs [先島版の index.html]
// 先島版は既定で ../../nansei-evacuation-sim/index.html（同じ階層に clone してある前提）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const here = import.meta.dirname;
const SAKI_HTML = process.argv[2] ?? path.resolve(here, '../../../nansei-evacuation-sim/index.html');
const OKI_HTML = path.resolve(here, '../../index.html');
const cut = (html, a, b) => {
  const s = html.indexOf(a), e = html.indexOf(b);
  if (s < 0 || e < 0) throw new Error(`モデル部分が見つかりません: ${a}`);
  return html.slice(s, e);
};
const run = (code) => { const c = {Math, Object, Array, JSON, Number, Infinity}; vm.createContext(c); vm.runInContext(code, c); return c.__out; };
const r0 = (x) => Math.round(x);

// ── 地図上の点（ノード）を共通の表にし、流れは番号で持つ
const common = `
const NODES=[], NIDX={};
const node=(key,n,lat,lng)=>{ if(!(key in NIDX)){NIDX[key]=NODES.length;NODES.push({key,n,lat:+lat.toFixed(4),lng:+lng.toFixed(4)});} return NIDX[key]; };
const R0=x=>Math.round(x);
const pushFlow=(arr,from,to,amt,kind)=>{ if(amt>=40) arr.push([from,to,R0(amt),kind]); };
`;

// ── 先島版
const sakiHtml = fs.readFileSync(SAKI_HTML, 'utf8');
const SAKI_RUNS = {
  s_kago: {label: '受入：鹿児島だけ', p: {}},
  s_kyushu: {label: '受入：九州・山口', p: {dest: 'kyushu'}},
  s_national: {label: '受入：全国分散', p: {dest: 'national'}},
  s_via50: {label: '九州・山口＋半分を那覇経由', p: {dest: 'kyushu', viaOkinawa: 50}},
  s_via100: {label: '九州・山口＋全部を那覇経由', p: {dest: 'kyushu', viaOkinawa: 100}},
  s_late: {label: '九州・山口＋着手が3日遅い', p: {dest: 'kyushu', startDelay: 6}},
  s_short: {label: '九州・山口＋猶予が7日', p: {dest: 'kyushu', warn: 7}},
  s_peak: {label: '九州・山口＋夏の観光ピーク', p: {dest: 'kyushu', peak: 1.6}},
};
const saki = run(cut(sakiHtml, '/* ===== 島（先島・有人14島） ===== */', 'function addCoast(map)') + common + `
;globalThis.__out=(()=>{
  ISLANDS.forEach(i=>node(i.id,i.n,i.lat,i.lng));
  ['ISG','MYK'].forEach(h=>{node('hub-'+h,HUBS[h].n,HUBS[h].lat,HUBS[h].lng);node('port-'+h,HUBS[h].n+'港',HUBS[h].port[0],HUBS[h].port[1]);});
  node('naha',NAHA.n,NAHA.lat,NAHA.lng); node('kagoport','鹿児島港',31.58,130.56);
  KYUSHU_AP.forEach(a=>node('ap-'+a.id,a.n,a.lat,a.lng));
  const runs={};
  for(const [id,def] of Object.entries(${JSON.stringify(SAKI_RUNS)})){
    const P={...PAR,...def.p}; const R=simulate(P); const A=R.A;
    const last=R.allDay??Math.min(R.frames.length-1,30);
    const F=R.frames.slice(0,last+1);
    const aps=KYUSHU_AP.filter(a=>DESTS[P.dest].aps.includes(a.id)); const apTot=aps.reduce((s,a)=>s+a.share,0);
    const days=F.map((f,d)=>{
      const vals={};
      ISLANDS.forEach(i=>{ vals[i.id]=R0(i.type==='hub'?f.q[i.hub]:(i.type==='bridge'?0:f.home[i.id])); });
      vals.naha=R0(f.naha);
      const flows=[];
      if(d>0){
        const p=F[d-1];
        const out=h=>ISLANDS.filter(i=>i.hub===h).reduce((s,i)=>s+p.left[i.id]-f.left[i.id],0);
        if(d<=P.startDelay){ ['ISG','MYK'].forEach(h=>pushFlow(flows,NIDX['hub-'+h],NIDX.naha,out(h),'self')); }
        else{
          ISLANDS.filter(i=>i.type!=='hub'&&i.type!=='bridge').forEach(i=>pushFlow(flows,NIDX[i.id],NIDX['hub-'+i.hub],p.home[i.id]-f.home[i.id],'feed'));
          const C=dayCaps(A,p.deployLeft>0,d>P.warn,P,d);
          const tot=C.toOkinawa+C.toDirect, ok=tot>0?C.toOkinawa/tot:0, seaDir=C.toDirect>0?C.seaDir/C.toDirect:0;
          let viaIn=0;
          ['ISG','MYK'].forEach(h=>{ const o=out(h); viaIn+=o*ok;
            pushFlow(flows,NIDX['hub-'+h],NIDX.naha,o*ok,'via');
            const dir=o*(1-ok); pushFlow(flows,NIDX['port-'+h],NIDX.kagoport,dir*seaDir,'sea');
            aps.forEach(a=>pushFlow(flows,NIDX['hub-'+h],NIDX['ap-'+a.id],dir*(1-seaDir)*a.share/apTot,'air')); });
          const onward=p.naha+viaIn-f.naha;
          aps.forEach(a=>pushFlow(flows,NIDX.naha,NIDX['ap-'+a.id],onward*a.share/apTot,'onward'));
        }
      }
      return {v:vals,t:{remaining:R0(f.remaining),arrived:R0(f.arrived),inSaki:R0(f.inSaki),naha:R0(f.naha)},f:flows};
    });
    runs[id]={sim:'saki',label:def.label,par:P,aps:aps.map(a=>a.id),days,
      sum:{target:R.target,residents:R.residents,tourists:R.tourists,warn:P.warn,startDelay:P.startDelay,
        atWar:R0(R.atWar),sakiDay:R.sakiDay,allDay:R.allDay,capFull:R.capFull,destCap:A.destCap,nahaPeak:R0(R.nahaPeak),
        eff:R0(R.eff),selfOut:R0(R.selfOut),selfRes:R0(R.selfRes)}};
  }
  return {nodes:NODES,runs};
})();`);

// ── 全県版
const okiHtml = fs.readFileSync(OKI_HTML, 'utf8');
let okiModel = cut(okiHtml, '/* ===== 対象地域 =====', 'function addCoast(map)');
const SNAP = 'left:Object.fromEntries(U.map(u=>[u.id,home(u)+hub(u)])),';
if (!okiModel.includes(SNAP)) throw new Error('snap() の形が変わっています');
okiModel = okiModel.replace(SNAP, SNAP + 'home:Object.fromEntries(U.map(u=>[u.id,home(u)])),');
okiModel += cut(okiHtml, '/* ===== シナリオ =====', 'let CURSCEN=null;');
const OKI_RUNS = {
  o_mid: {label: '中間シナリオ', p: {}},
  o_start4: {label: '決心が3日早い', p: {startDelay: 4}},
  o_start10: {label: '決心が3日遅い', p: {startDelay: 10}},
  o_warn21: {label: '猶予が21日', p: {warn: 21}},
  o_warn30: {label: '猶予が30日', p: {warn: 30}},
  o_warn40: {label: '猶予が40日', p: {warn: 40}},
  o_planes165: {label: '民間機を1.5倍', p: {planes: 165}},
  o_planes220: {label: '民間機を2倍', p: {planes: 220}},
  o_us60: {label: '嘉手納を3倍使う', p: {usBases: 60}},
  o_ships60: {label: '船舶の徴用を1.5倍', p: {shipRate: 60}},
  o_spots: {label: '那覇の駐機スポットを3割増', p: {}, spots: 39},
  o_combo: {label: '決心3日早く＋民間機1.5倍＋嘉手納3倍', p: {startDelay: 4, planes: 165, usBases: 60}},
  o_kyushu: {label: '受入：九州・山口だけ', p: {dest: 'kyushu'}},
  o_mobilize: {label: '受入：全国総動員', p: {dest: 'mobilize'}},
  o_via50: {label: '先島の半分を本島経由', p: {viaOkinawa: 50}},
  o_via100: {label: '先島の全部を本島経由', p: {viaOkinawa: 100}},
  o_peak: {label: '夏の観光ピーク', p: {peak: 1.6}},
  o_self18: {label: '早めの自主避難が進む', p: {selfRes: 18}},
  o_pess: {label: '悲観シナリオ', scen: 'pess'},
  o_opt: {label: '楽観シナリオ', scen: 'opt'},
};
const oki = run(okiModel + common + `
;globalThis.__out=(()=>{
  ISLANDS.forEach(i=>node(i.id,i.n,i.lat,i.lng));
  HUBIDS.forEach(h=>{node('hub-'+h,HUBS[h].n,HUBS[h].lat,HUBS[h].lng);node('port-'+h,HUBS[h].n+'港',HUBS[h].port[0],HUBS[h].port[1]);});
  node('kadena',BASES.kadena.n,BASES.kadena.lat,BASES.kadena.lng);
  SEA_PORTS.forEach(p=>node('sp-'+p.n,p.n,p.lat,p.lng));
  KYUSHU_AP.forEach(a=>node('ap-'+a.id,a.n,a.lat,a.lng));
  const mid={...BASE_PAR,...SCEN.mid.par};
  const runs={};
  for(const [id,def] of Object.entries(${JSON.stringify(OKI_RUNS)})){
    const P=def.scen?{...BASE_PAR,...SCEN[def.scen].par}:{...mid,...def.p};
    const saved=HUBS.OKA.spot; if(def.spots) HUBS.OKA.spot=def.spots;
    const R=simulate(P); const A=R.A;
    const last=R.allDay??Math.min(R.frames.length-1,70);
    const F=R.frames.slice(0,last+1);
    const shareTot=SEA_PORTS.reduce((s,p)=>s+p.share,0);
    const days=F.map((f,d)=>{
      const vals={};
      ISLANDS.forEach(i=>{ vals[i.id]=R0(i.type==='main'?f.left[i.id]:i.type==='hub'?f.q[i.hub]:(i.type==='bridge'?0:f.home[i.id])); });
      vals['hub-OKA']=R0(f.transit);
      const flows=[];
      if(d>0){
        const p=F[d-1];
        const out=h=>ISLANDS.filter(i=>i.hub===h).reduce((s,i)=>s+p.left[i.id]-f.left[i.id],0);
        if(d<=P.startDelay){
          HUBIDS.forEach(h=>[['haneda',.45],['itami',.25],['fukuoka',.3]].forEach(([ap,w])=>pushFlow(flows,NIDX['hub-'+h],NIDX['ap-'+ap],out(h)*w,'self')));
        }else{
          ISLANDS.filter(i=>i.type==='main').forEach(i=>pushFlow(flows,NIDX[i.id],NIDX['hub-OKA'],p.home[i.id]-f.home[i.id],'land'));
          ISLANDS.filter(i=>i.type!=='main'&&i.type!=='hub'&&i.type!=='bridge').forEach(i=>pushFlow(flows,NIDX[i.id],NIDX['hub-'+i.hub],p.home[i.id]-f.home[i.id],'feed'));
          const C=dayCaps(A,p.deployLeft>0,d>P.warn,P,d,{OKA:p.q.OKA+p.inOka*0.4,MYK:p.q.MYK,ISG:p.q.ISG});
          const apTot=Object.values(C.apUse).reduce((s,x)=>s+x,0)||1;
          const v=P.viaOkinawa/100; let viaIn=0;
          HUBIDS.forEach(h=>{
            let o=out(h);
            if(h!=='OKA'&&v>0){ const via=o*v; viaIn+=via; o-=via; pushFlow(flows,NIDX['hub-'+h],NIDX['hub-OKA'],via,'via'); }
            const t=C.pax[h]+C.sea[h], sea=t>0?o*C.sea[h]/t:0, air=o-sea;
            SEA_PORTS.forEach(sp=>pushFlow(flows,NIDX['port-'+h],NIDX['sp-'+sp.n],sea*sp.share/shareTot,'sea'));
            const us=h==='OKA'&&C.pax.OKA>0?air*C.usPax/C.pax.OKA:0;
            Object.entries(C.apUse).forEach(([ap,u])=>{ const w=u/apTot;
              pushFlow(flows,NIDX['hub-'+h],NIDX['ap-'+ap],(air-us)*w,'air');
              if(us>0) pushFlow(flows,NIDX.kadena,NIDX['ap-'+ap],us*w,'us'); });
          });
          // 本島に並び直した経由者の出発（那覇から本土へ）
          const transitOut=p.transit+viaIn-f.transit;
          if(transitOut>0) Object.entries(C.apUse).forEach(([ap,u])=>pushFlow(flows,NIDX['hub-OKA'],NIDX['ap-'+ap],transitOut*u/apTot,'onward'));
        }
      }
      return {v:vals,t:{remaining:R0(f.remaining),arrived:R0(f.arrived),inSaki:R0(f.inSaki),inOka:R0(f.inOka),naha:R0(f.transit)},f:flows};
    });
    HUBS.OKA.spot=saved;
    runs[id]={sim:'oki',label:def.label,par:P,aps:DESTS[P.dest].aps,days,
      sum:{target:R.target,residents:R.residents,tourists:R.tourists,warn:P.warn,startDelay:P.startDelay,
        atWar:R0(R.atWar),sakiDay:R.sakiDay,okaDay:R.okaDay,allDay:R.allDay,destCap:A.destCap,needShelter:R0(R.needShelter),
        shelterOver:R0(R.shelterOver),transitPeak:R0(R.transitPeak),eff:R0(R.eff),selfOut:R0(R.selfOut),selfRes:R0(R.selfRes),
        rem:R.rem.slice(0,91).map(R0)}};
  }
  return {nodes:NODES,runs,coast:COAST};
})();`);

const outDir = path.resolve(here, '../src/data');
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'saki.json'), JSON.stringify(saki));
fs.writeFileSync(path.join(outDir, 'oki.json'), JSON.stringify(oki));
for (const [sim, d] of [['saki', saki], ['oki', oki]]) {
  console.log(`[${sim}] nodes ${d.nodes.length}`);
  for (const [id, r] of Object.entries(d.runs)) {
    const s = r.sum;
    console.log(`  ${id.padEnd(12)} ${r.label.padEnd(22)} days ${String(r.days.length - 1).padStart(3)} atWar ${String(s.atWar).padStart(8)} saki ${s.sakiDay} all ${s.allDay} flows/day ${Math.round(r.days.reduce((a, x) => a + x.f.length, 0) / r.days.length)}`);
  }
}
for (const f of ['saki.json', 'oki.json']) console.log(f, (fs.statSync(path.join(outDir, f)).size / 1e6).toFixed(2), 'MB');
