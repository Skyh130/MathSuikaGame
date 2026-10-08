import { fmtDeg, fmtFraction, fmtKorean, fmtLength, fmtTime, KINDS, makeFractionLabel, makeLabel, type LabelOpts } from '../math/labels';
import { makeExpr } from '../math/expr';
import type { Topic } from './quests';

/** 과일 그림 번호별 대체 색 (그림을 못 불러왔을 때) */
export const HUES = [350, 24, 46, 88, 140, 174, 208, 256, 318, 8];
export const SPRITE_COUNT = 10;

export interface WorldDef {
  id: string;
  name: string;
  /** 한 줄 소개 (월드 고르는 화면) */
  blurb: string;
  /** 추천 학년 */
  grades: string;
  emoji: string;
  /** 단계별 값 (가장 작은 단위의 정수). 같은 값 2개가 닿으면 다음 단계가 된다. */
  ladder: number[];
  /** 단계별 반지름 (논리 좌표) */
  radii: number[];
  /** 처음에 떨어질 수 있는 단계 */
  spawnTiers: number[];
  /** 쉬움 모드에서 단계별로 보여줄 과일 그림 번호 */
  sprites: number[];
  /** 값을 여러 모양의 식으로 보여준다 */
  label: (value: number, o: LabelOpts) => string;
  /** 값을 한 가지로 보여준다 (사다리, 안내 문구) */
  format: (value: number) => string;
  /** 퀘스트를 고를 때 우선하는 주제 */
  topics: Topic[];
}

/** 단계 수에 맞춰 반지름을 20 → 118 로 고르게 키운다 */
function radiiFor(n: number): number[] {
  if (n === 10) return [20, 26, 34, 42, 52, 62, 74, 88, 102, 118];
  return Array.from({ length: n }, (_, i) => Math.round(22 * Math.pow(118 / 22, i / (n - 1))));
}

/** 단계 수가 10보다 적어도 마지막 단계는 항상 수박이 되도록 그림을 고른다 */
function spritesFor(n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round((i * (SPRITE_COUNT - 1)) / (n - 1)));
}

function world(w: Omit<WorldDef, 'radii' | 'spawnTiers' | 'sprites'>): WorldDef {
  const n = w.ladder.length;
  return { ...w, radii: radiiFor(n), spawnTiers: [0, 0, 0, 1, 1, 2, 3], sprites: spritesFor(n) };
}

export const WORLDS: WorldDef[] = [
  world({
    id: 'double-forest',
    name: '더블 숲',
    blurb: '덧셈·뺄셈·곱셈 식 찾기',
    grades: '2학년',
    emoji: '🌳',
    ladder: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
    label: (v, o) => makeExpr(v, o),
    format: String,
    topics: ['make-expr', 'pattern', 'number-sense'],
  }),
  world({
    id: 'length-village',
    name: '길이 마을',
    blurb: 'm와 cm 바꾸기, 길이 더하고 빼기',
    grades: '2~3학년',
    emoji: '📏',
    ladder: [10, 20, 40, 80, 160, 320, 640, 1280],
    label: (v, o) => makeLabel(v, KINDS.length, o),
    format: fmtLength,
    topics: ['measure', 'logic'],
  }),
  world({
    id: 'clock-tower',
    name: '시계탑',
    blurb: '시간과 분, 시각의 덧셈·뺄셈',
    grades: '2~3학년',
    emoji: '⏰',
    ladder: [15, 30, 60, 120, 240, 480, 960],
    label: (v, o) => makeLabel(v, KINDS.time, o),
    format: fmtTime,
    topics: ['time', 'counting'],
  }),
  world({
    id: 'fraction-pond',
    name: '분수 연못',
    blurb: '크기가 같은 분수, 분수의 덧셈·뺄셈',
    grades: '3~4학년',
    emoji: '🍕',
    ladder: [2, 4, 8, 16, 32, 64, 128, 256],
    label: (v, o) => makeFractionLabel(v, o),
    format: fmtFraction,
    topics: ['fraction', 'logic'],
  }),
  world({
    id: 'big-number-mountain',
    name: '큰 수 산',
    blurb: '만·천·백, 큰 수의 덧셈과 뺄셈',
    grades: '4학년',
    emoji: '⛰️',
    ladder: [500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000],
    label: (v, o) => makeLabel(v, KINDS.big, o),
    format: fmtKorean,
    topics: ['big-number', 'number-sense'],
  }),
  world({
    id: 'angle-castle',
    name: '각도 성',
    blurb: '각도의 합과 차, 삼각형의 세 각',
    grades: '4학년',
    emoji: '📐',
    ladder: [5, 10, 20, 40, 80, 160, 320],
    label: (v, o) => makeLabel(v, KINDS.angle, o),
    format: fmtDeg,
    topics: ['angle', 'logic'],
  }),
];

export const DOUBLE_FOREST = WORLDS[0];
export const getWorld = (id: string | undefined): WorldDef => WORLDS.find((w) => w.id === id) ?? DOUBLE_FOREST;
