import {
  DOUBLE_TAP_SCALE,
  INITIAL_ZOOM,
  MAX_SCALE,
  clampPan,
  distance,
  midpoint,
  panBy,
  toTransform,
  zoomAt,
} from './zoom-pan';

describe('zoom-pan', () => {
  // 容器 400x800，圖片顯示大小 400x566（A4 直式、寬度撐滿）
  const view = { w: 400, h: 800 };
  const content = { w: 400, h: 566 };

  describe('clampPan', () => {
    it('keeps the image centered at scale 1', () => {
      expect(clampPan({ scale: 1, x: 50, y: -30 }, content, view)).toEqual({ scale: 1, x: 0, y: 0 });
    });

    it('limits panning to the scaled overflow only', () => {
      // scale 3: 寬 1200 → 左右各可移 400；高 1698 → 上下各可移 449
      const s = clampPan({ scale: 3, x: 9999, y: -9999 }, content, view);
      expect(s).toEqual({ scale: 3, x: 400, y: -449 });
    });

    it('keeps an axis centered while it still fits inside the view', () => {
      // scale 1.2: 高 679 < 800，垂直方向仍放得進容器，不可平移
      const s = clampPan({ scale: 1.2, x: 0, y: 200 }, content, view);
      expect(s.y).toBe(0);
    });

    it('clamps scale into [1, MAX_SCALE]', () => {
      expect(clampPan({ scale: 0.2, x: 0, y: 0 }, content, view).scale).toBe(1);
      expect(clampPan({ scale: 99, x: 0, y: 0 }, content, view).scale).toBe(MAX_SCALE);
    });
  });

  describe('zoomAt', () => {
    it('keeps the focus point fixed on screen', () => {
      // 焦點在中心偏右 100px、偏上 150px
      const focus = { x: 100, y: -150 };
      const before = { scale: 1.5, x: 20, y: 10 };
      const after = zoomAt(before, 3, focus, content, view);
      // 焦點對應的圖片內座標 p：screen = t + s*p，縮放前後應相同
      const px = (focus.x - before.x) / before.scale;
      const py = (focus.y - before.y) / before.scale;
      expect(after.x + after.scale * px).toBeCloseTo(focus.x);
      expect(after.y + after.scale * py).toBeCloseTo(focus.y);
    });

    it('zooming at the center does not move the image', () => {
      const s = zoomAt(INITIAL_ZOOM, 2, { x: 0, y: 0 }, content, view);
      expect(s).toEqual({ scale: 2, x: 0, y: 0 });
    });

    it('cannot zoom out below 1x and returns to the center', () => {
      const s = zoomAt({ scale: 2, x: 100, y: 100 }, 0.5, { x: 30, y: 30 }, content, view);
      expect(s).toEqual({ scale: 1, x: 0, y: 0 });
    });

    it('cannot zoom in beyond the maximum', () => {
      const s = zoomAt(INITIAL_ZOOM, 100, { x: 0, y: 0 }, content, view);
      expect(s.scale).toBe(MAX_SCALE);
    });

    it('keeps the result inside the pan bounds', () => {
      // 焦點在最右邊放大，仍不能露出圖片右側之外的空白
      const s = zoomAt(INITIAL_ZOOM, DOUBLE_TAP_SCALE, { x: 200, y: 0 }, content, view);
      const maxX = (content.w * DOUBLE_TAP_SCALE - view.w) / 2;
      expect(Math.abs(s.x)).toBeLessThanOrEqual(maxX);
    });
  });

  describe('panBy', () => {
    it('moves the image while zoomed in', () => {
      const s = panBy({ scale: 3, x: 0, y: 0 }, -120, 40, content, view);
      expect(s).toEqual({ scale: 3, x: -120, y: 40 });
    });

    it('does nothing at 1x', () => {
      expect(panBy(INITIAL_ZOOM, 80, 80, content, view)).toEqual(INITIAL_ZOOM);
    });

    it('stops at the edges', () => {
      const s = panBy({ scale: 3, x: 390, y: 0 }, 100, 0, content, view);
      expect(s.x).toBe(400);
    });
  });

  it('computes distance and midpoint of two touches', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 10 }, { x: 20, y: 30 })).toEqual({ x: 10, y: 20 });
  });

  it('formats a css transform', () => {
    expect(toTransform({ scale: 2, x: 10, y: -5 })).toBe('translate(10px, -5px) scale(2)');
  });
});
