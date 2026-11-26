import raw from './data/sim.json';

export type HubId = 'OKA' | 'MYK' | 'ISG';
export type Island = {
  id: string; n: string; pop: number; lat: number; lng: number;
  type: 'main' | 'hub' | 'bridge' | 'strip' | 'heli' | 'port'; hub: HubId;
};
export type Frame = {
  day: number; left: Record<string, number>; home: Record<string, number>;
  q: Record<HubId, number>; inSaki: number; inOka: number; remaining: number; arrived: number;
};
export type Caps = {seaShare: Record<HubId, number>; usShare: number; apShare: Record<string, number>; g: number} | null;
export type Scenario = {
  key: string; name: string; destName: string; destCap: number;
  par: {startDelay: number; warn: number; planes: number; usBases: number; dest: string; [k: string]: unknown};
  frames: Frame[]; rem: number[]; caps: Caps[];
  target: number; residents: number; tourists: number; sakiTarget: number;
  selfOut: number; selfRes: number; atWar: number; eff: number;
  sakiDay: number | null; okaDay: number | null; allDay: number | null;
};
type LatLng = {n: string; lat: number; lng: number};

export const GEO = raw.geo as unknown as {
  islands: Island[];
  hubs: Record<HubId, LatLng & {port: [number, number]; ap: string; spot: number; turn: number}>;
  bases: {kadena: LatLng};
  seaPorts: (LatLng & {share: number})[];
  airports: (LatLng & {id: string; slots: number})[];
  coast: Record<string, [number, number][]>;
};
export const SCN = raw.scenarios as unknown as Record<'pess' | 'mid' | 'opt', Scenario>;
