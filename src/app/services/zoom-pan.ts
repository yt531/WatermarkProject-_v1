/**
 * 全螢幕預覽的縮放與平移計算（純函式，不依賴 DOM）。
 *
 * 座標模型：圖片以容器中心為縮放原點，畫面位置 = 中心 + (x, y) + scale * 圖片內座標。
 * focus 一律是「相對於容器中心」的螢幕座標（像素）。
 */

export interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
export const DOUBLE_TAP_SCALE = 2.5;

export const INITIAL_ZOOM: ZoomState = { scale: MIN_SCALE, x: 0, y: 0 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 限制平移範圍：圖片放大後不能被拖出容器、露出空白；比容器小的那一軸固定置中 */
export function clampPan(state: ZoomState, content: Size, view: Size): ZoomState {
  const scale = clamp(state.scale, MIN_SCALE, MAX_SCALE);
  const maxX = Math.max(0, (content.w * scale - view.w) / 2);
  const maxY = Math.max(0, (content.h * scale - view.h) / 2);
  return {
    scale,
    x: clamp(state.x, -maxX, maxX) || 0, // `|| 0` 把 -0 正規化成 0
    y: clamp(state.y, -maxY, maxY) || 0,
  };
}

/** 以 focus 為不動點縮放到 newScale（手指或滑鼠下的那一點會停在原地） */
export function zoomAt(
  state: ZoomState,
  newScale: number,
  focus: Point,
  content: Size,
  view: Size
): ZoomState {
  const scale = clamp(newScale, MIN_SCALE, MAX_SCALE);
  const k = scale / state.scale;
  return clampPan(
    {
      scale,
      x: focus.x - (focus.x - state.x) * k,
      y: focus.y - (focus.y - state.y) * k,
    },
    content,
    view
  );
}

export function panBy(state: ZoomState, dx: number, dy: number, content: Size, view: Size): ZoomState {
  return clampPan({ ...state, x: state.x + dx, y: state.y + dy }, content, view);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function toTransform(state: ZoomState): string {
  return `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}
