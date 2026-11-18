import {
  clampAnchorToCanvas,
  getFontCss,
  getFontSize,
  getSingleAnchor,
  isPointOnText,
} from './watermark-layout';

describe('watermark-layout', () => {
  describe('getFontSize', () => {
    it('is 1/20 of the canvas width at the default size', () => {
      expect(getFontSize(400, 50)).toBe(20);
    });

    it('scales linearly with size', () => {
      expect(getFontSize(400, 100)).toBe(40);
      expect(getFontSize(400, 25)).toBe(10);
    });

    it('scales with canvas width', () => {
      expect(getFontSize(800, 50)).toBe(40);
    });
  });

  it('getFontCss builds a bold quoted font string', () => {
    expect(getFontCss(20, 'Noto Sans TC')).toBe('bold 20px "Noto Sans TC"');
  });

  describe('getSingleAnchor', () => {
    // 畫布 400x200，字級 20，文字寬 40 → 邊距 20
    const anchor = (pos: string, custom: { x: number; y: number } | null = null) =>
      getSingleAnchor(400, 200, 20, 40, pos, custom);

    it('centers for middle-center', () => {
      expect(anchor('middle-center')).toEqual({ x: 200, y: 100 });
    });

    it('places the nine preset positions', () => {
      expect(anchor('top-left')).toEqual({ x: 40, y: 30 });
      expect(anchor('top-center')).toEqual({ x: 200, y: 30 });
      expect(anchor('top-right')).toEqual({ x: 360, y: 30 });
      expect(anchor('middle-left')).toEqual({ x: 40, y: 100 });
      expect(anchor('middle-right')).toEqual({ x: 360, y: 100 });
      expect(anchor('bottom-left')).toEqual({ x: 40, y: 170 });
      expect(anchor('bottom-center')).toEqual({ x: 200, y: 170 });
      expect(anchor('bottom-right')).toEqual({ x: 360, y: 170 });
    });

    it('falls back to the center for unknown positions', () => {
      expect(anchor('nonsense')).toEqual({ x: 200, y: 100 });
    });

    it('customPos (ratios) overrides the preset', () => {
      expect(anchor('top-left', { x: 0.25, y: 0.5 })).toEqual({ x: 100, y: 100 });
    });

    it('keeps a custom position inside the canvas', () => {
      expect(anchor('middle-center', { x: 0, y: 0 })).toEqual({ x: 20, y: 10 });
      expect(anchor('middle-center', { x: 1, y: 1 })).toEqual({ x: 380, y: 190 });
    });

    it('uses the rotated bounding box when clamping', () => {
      // 文字 40x20 旋轉 90 度後外框為 20x40 → x 範圍 [10,390]，y 範圍 [20,180]
      const p = getSingleAnchor(400, 200, 20, 40, 'middle-center', { x: 0, y: 0 }, 90);
      expect(p.x).toBeCloseTo(10);
      expect(p.y).toBeCloseTo(20);
    });
  });

  describe('clampAnchorToCanvas', () => {
    // 畫布 400x200，文字 100x20 → x 範圍 [50,350]，y 範圍 [10,190]
    const clamp = (x: number, y: number, textW = 100, textH = 20) =>
      clampAnchorToCanvas({ x, y }, 400, 200, textW, textH);

    it('leaves points inside the bounds untouched', () => {
      expect(clamp(200, 100)).toEqual({ x: 200, y: 100 });
    });

    it('clamps each side', () => {
      expect(clamp(-50, -50)).toEqual({ x: 50, y: 10 });
      expect(clamp(999, 999)).toEqual({ x: 350, y: 190 });
    });

    it('accounts for rotation', () => {
      // 100x20 旋轉 90 度 → 外框 20x100：x 範圍 [10,390]，y 範圍 [50,150]
      const p = clampAnchorToCanvas({ x: 0, y: 0 }, 400, 200, 100, 20, 90);
      expect(p.x).toBeCloseTo(10);
      expect(p.y).toBeCloseTo(50);
    });

    it('pins text wider than the canvas to the center', () => {
      expect(clamp(0, 0, 600, 300)).toEqual({ x: 200, y: 100 });
      expect(clamp(999, 999, 600, 300)).toEqual({ x: 200, y: 100 });
    });
  });

  describe('isPointOnText', () => {
    const anchor = { x: 200, y: 100 };

    it('hits inside the text box', () => {
      expect(isPointOnText({ x: 210, y: 105 }, anchor, 100, 20)).toBe(true);
    });

    it('hits within the default 20px padding', () => {
      // 半寬 50 + 20 = 70；半高 10 + 20 = 30
      expect(isPointOnText({ x: 200 + 69, y: 100 + 29 }, anchor, 100, 20)).toBe(true);
    });

    it('misses beyond the padding', () => {
      expect(isPointOnText({ x: 200 + 70, y: 100 }, anchor, 100, 20)).toBe(false);
      expect(isPointOnText({ x: 200, y: 100 + 30 }, anchor, 100, 20)).toBe(false);
    });

    it('honours a custom padding', () => {
      expect(isPointOnText({ x: 200 + 55, y: 100 }, anchor, 100, 20, 0)).toBe(false);
      expect(isPointOnText({ x: 200 + 55, y: 100 }, anchor, 100, 20, 10)).toBe(true);
    });
  });
});
