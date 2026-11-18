/**
 * 浮水印版面計算：預覽與匯出共用，確保兩邊算出來的位置一致。
 * 都是不依賴 DOM 的純函式。
 */

export interface Point {
  x: number;
  y: number;
}

/** 文字字級：基準為畫布寬度的 1/20，再依 size（50 為基準值）縮放 */
export function getFontSize(canvasWidth: number, size: number): number {
  return (canvasWidth / 20) * (size / 50);
}

export function getFontCss(fontSize: number, family: string): string {
  return `bold ${fontSize}px "${family}"`;
}

/**
 * 單張模式下文字中心點的位置（畫布像素）。
 * customPos（0~1 的比例）優先於九宮格預設位置 pos（例如 "top-left"）。
 */
export function getSingleAnchor(
  canvasWidth: number,
  canvasHeight: number,
  fontSize: number,
  textWidth: number,
  pos: string,
  customPos: Point | null
): Point {
  if (customPos) {
    return { x: customPos.x * canvasWidth, y: customPos.y * canvasHeight };
  }

  const [vertical, horizontal] = pos.split('-');
  const margin = fontSize;

  let x: number;
  if (horizontal === 'left') x = margin + textWidth / 2;
  else if (horizontal === 'right') x = canvasWidth - margin - textWidth / 2;
  else x = canvasWidth / 2;

  let y: number;
  if (vertical === 'top') y = margin + fontSize / 2;
  else if (vertical === 'bottom') y = canvasHeight - margin - fontSize / 2;
  else y = canvasHeight / 2;

  return { x, y };
}

/** 把中心點限制在畫布內，讓整段文字不會被拖出邊界（文字比畫布大時固定在中央） */
export function clampAnchorToCanvas(
  anchor: Point,
  canvasWidth: number,
  canvasHeight: number,
  textWidth: number,
  textHeight: number
): Point {
  const minX = Math.min(textWidth / 2, canvasWidth / 2);
  const maxX = Math.max(canvasWidth - textWidth / 2, canvasWidth / 2);
  const minY = Math.min(textHeight / 2, canvasHeight / 2);
  const maxY = Math.max(canvasHeight - textHeight / 2, canvasHeight / 2);
  return {
    x: Math.max(minX, Math.min(anchor.x, maxX)),
    y: Math.max(minY, Math.min(anchor.y, maxY)),
  };
}

/** 點擊/觸碰點是否落在文字範圍內（四周多留 padding 像素，方便手指點選） */
export function isPointOnText(
  point: Point,
  anchor: Point,
  textWidth: number,
  fontSize: number,
  padding = 20
): boolean {
  return (
    Math.abs(point.x - anchor.x) < textWidth / 2 + padding &&
    Math.abs(point.y - anchor.y) < fontSize / 2 + padding
  );
}
