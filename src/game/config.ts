/** 논리 좌표 (화면 크기와 무관). 상자 그림(public/assets/ui/box.png) 기준으로 잡는다. */
// tools/prep-assets.py 가 알려준 상자 그림의 크기와 안쪽 위치(픽셀)
const BOX_IMG = { w: 700, h: 1037, inL: 55, inR: 644, inTop: 75, floor: 925 };

/** 상자 안쪽의 폭 (논리 좌표) */
export const IN_W = 360;
const S = IN_W / (BOX_IMG.inR - BOX_IMG.inL);

/** 상자 위쪽, 과일을 들고 있는 공간 */
export const TOP_ZONE = 84;
export const BOX_RECT = { x: 0, y: TOP_ZONE, w: BOX_IMG.w * S, h: BOX_IMG.h * S };

export const CW = Math.round(BOX_RECT.w);
export const CH = Math.round(TOP_ZONE + BOX_RECT.h);
export const LEFT = BOX_IMG.inL * S;
export const RIGHT = LEFT + IN_W;
export const FLOOR_Y = TOP_ZONE + BOX_IMG.floor * S;
export const DANGER_Y = TOP_ZONE + BOX_IMG.inTop * S + 34;
export const SPAWN_Y = 48;
export const WALL = 60;
export const GAME_OVER_MS = 2200;
export const DROP_COOLDOWN_MS = 450;
