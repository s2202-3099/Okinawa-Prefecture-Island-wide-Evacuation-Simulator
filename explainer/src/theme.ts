import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// 夜の地図をベースにした配色。流れや人の量を光で見せる
export const C = {
  bg: '#0B1624',
  sea: '#0E1D30',
  seaGlow: '#13283F',
  land: '#1F3147',
  landEdge: '#3B5574',
  grid: 'rgba(120,160,200,0.06)',
  text: '#EEF3F8',
  sub: '#9DB0C4',
  dim: '#6B7F95',
  panel: 'rgba(12,24,40,0.86)',
  panelEdge: 'rgba(140,180,220,0.22)',
  people: '#F0568C', // 島に残る人
  peopleSoft: 'rgba(240,86,140,0.35)',
  done: '#3FD3B6', // 退避が済んだ
  air: '#FFE6A8', // 空路
  sea_route: '#53C6F0', // 海路
  us: '#B79CFF', // 嘉手納
  feed: '#FF8FB8', // 島間・陸送
  self: '#9FB3C8', // 定期便
  via: '#FFB15E', // 那覇経由
  dest: '#FFB15E',
  attack: '#FF4D4D',
  good: '#3FD3B6',
  bad: '#FF6B7A',
  zunda: '#8DDB6E',
  tsumugi: '#FFC24B',
};

export const fontFamily = 'Noto Sans JP';
for (const weight of ['400', '700', '900']) {
  loadFont({family: fontFamily, url: staticFile(`fonts/NotoSansJP-${weight}.ttf`), weight});
}

export const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
export const man = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}万` : fmt(n));
