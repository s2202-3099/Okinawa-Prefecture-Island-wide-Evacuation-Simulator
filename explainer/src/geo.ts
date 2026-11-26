export const W = 1920;
export const H = 1080;
const COS = Math.cos((27 * Math.PI) / 180);

// span＝画面の横幅に入る経度の幅
export type Camera = {lng: number; lat: number; span: number};

export const project = (cam: Camera, lng: number, lat: number) => {
  const ppd = W / cam.span;
  return {x: W / 2 + (lng - cam.lng) * ppd, y: H / 2 - ((lat - cam.lat) * ppd) / COS};
};

export const lerpCam = (a: Camera, b: Camera, t: number): Camera => ({
  lng: a.lng + (b.lng - a.lng) * t,
  lat: a.lat + (b.lat - a.lat) * t,
  span: Math.exp(Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * t),
});

// 2点を結ぶゆるい弧（二次ベジェ）
export const arc = (p: {x: number; y: number}, q: {x: number; y: number}, bend = 0.12) => {
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  const dx = q.x - p.x, dy = q.y - p.y;
  const c = {x: mx - dy * bend, y: my + dx * bend};
  return {
    d: `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`,
    at: (t: number) => ({
      x: (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * c.x + t * t * q.x,
      y: (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * c.y + t * t * q.y,
    }),
  };
};

// カメラの置き場所。地図の見せたいものを、字幕とパネルを避けた左寄りに置く
export const CAMS: Record<string, Camera> = {
  japan: {lng: 132.0, lat: 30.4, span: 30},
  saki: {lng: 125.15, lat: 24.25, span: 5.6},
  sakitw: {lng: 123.6, lat: 24.0, span: 8},
  sakinaha: {lng: 126.6, lat: 25.0, span: 9.5},
  pref: {lng: 128.2, lat: 25.5, span: 12.5},
};
