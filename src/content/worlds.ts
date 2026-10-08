export interface WorldDef {
  id: string;
  name: string;
  /** 단계별 값. 같은 값 2개가 닿으면 다음 단계가 된다. */
  ladder: number[];
  /** 단계별 반지름 (논리 좌표) */
  radii: number[];
  /** 처음에 떨어질 수 있는 단계 */
  spawnTiers: number[];
  /** 단계별 색 (hue) */
  hues: number[];
}

export const DOUBLE_FOREST: WorldDef = {
  id: 'double-forest',
  name: '더블 숲',
  ladder: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
  radii: [20, 26, 34, 42, 52, 62, 74, 88, 102, 118],
  spawnTiers: [0, 0, 0, 1, 1, 2, 3],
  hues: [350, 24, 46, 88, 140, 174, 208, 256, 318, 8],
};
