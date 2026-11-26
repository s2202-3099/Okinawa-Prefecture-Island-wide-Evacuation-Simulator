// 立ち絵の設定。素材を public/characters/<名前>/ に置いて art を埋めると、仮のアイコンから差し替わる。
//   base   : 口を閉じた立ち絵（PNG、背景透過）
//   mouth  : 口を開いた差分（任意。base と同じ大きさで重ねる）
//   blink  : 目を閉じた差分（任意）
// 例: art: {base: 'characters/zundamon/base.png', mouth: 'characters/zundamon/mouth.png', blink: 'characters/zundamon/blink.png', height: 560}
export type Art = {base: string; mouth?: string; blink?: string; height: number; flip?: boolean};
export type CharDef = {name: string; color: string; initial: string; art: Art | null};

export const CHARS: Record<'z' | 't', CharDef> = {
  z: {name: 'ずんだもん', color: '#8DDB6E', initial: 'ず', art: null},
  t: {name: '春日部つむぎ', color: '#FFC24B', initial: 'つ', art: null},
};
