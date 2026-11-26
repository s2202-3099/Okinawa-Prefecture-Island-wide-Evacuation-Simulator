import okiRaw from './data/oki.json';
import sakiRaw from './data/saki.json';

export type Node = {key: string; n: string; lat: number; lng: number};
export type Flow = [from: number, to: number, amount: number, kind: string];
export type Day = {v: Record<string, number>; t: {remaining: number; arrived: number; inSaki: number; inOka?: number; naha: number}; f: Flow[]};
export type Run = {
  sim: 'saki' | 'oki'; label: string; par: Record<string, unknown>; aps: string[]; days: Day[];
  sum: {target: number; warn: number; startDelay: number; atWar: number; sakiDay: number | null; allDay: number | null; rem?: number[]};
};
type SimData = {nodes: Node[]; runs: Record<string, Run>};

export const SIMS = {saki: sakiRaw as unknown as SimData, oki: okiRaw as unknown as SimData};
export const COAST = (okiRaw as unknown as {coast: Record<string, [number, number][]>}).coast;
export const RUNS: Record<string, Run> = {...SIMS.saki.runs, ...SIMS.oki.runs};
export const nodesOf = (r: Run) => SIMS[r.sim].nodes;
export const nodeIndex = (r: Run) => Object.fromEntries(nodesOf(r).map((n, i) => [n.key, i]));
