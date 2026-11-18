import { TestBed } from '@angular/core/testing';
import { WatermarkExportService } from './watermark-export.service';
import { WatermarkParams, WatermarkStateService } from './watermark-state.service';

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((t: string) => ({ width: t.length * 10 })),
    font: '',
    fillStyle: '',
    globalAlpha: 1,
    textBaseline: '',
    textAlign: '',
  };
}

function params(overrides: Partial<WatermarkParams> = {}): WatermarkParams {
  return {
    text: 'ABCD', // measureText => 40
    font: 'Arial',
    color: '#ff0000',
    size: 50,
    rotate: 0,
    opacity: 0.4,
    gap: 100,
    pos: 'middle-center',
    mask: null,
    customPos: null,
    mode: 'single',
    ...overrides,
  };
}

describe('WatermarkExportService', () => {
  let service: WatermarkExportService;
  let state: WatermarkStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WatermarkExportService);
    state = TestBed.inject(WatermarkStateService);
  });

  describe('applyWatermarkToCanvas', () => {
    // width 400 => basePx 20, size 50 => fontSize 20
    const W = 400;
    const H = 200;

    const draw = (p: WatermarkParams) => {
      const ctx = makeCtx();
      service.applyWatermarkToCanvas(ctx as unknown as CanvasRenderingContext2D, W, H, p);
      return ctx;
    };

    it('sets font, color and opacity from params', () => {
      const ctx = draw(params({ font: 'Courier', color: '#00ff00', opacity: 0.7 }));
      expect(ctx.font).toBe('bold 20px "Courier"');
      expect(ctx.fillStyle).toBe('#00ff00');
      // restored to 1 after drawing
      expect(ctx.globalAlpha).toBe(1);
    });

    it('scales font size with the size param', () => {
      const ctx = draw(params({ size: 100 }));
      expect(ctx.font).toBe('bold 40px "Arial"');
    });

    it('draws once, centered, in single mode', () => {
      const ctx = draw(params());
      expect(ctx.fillText).toHaveBeenCalledTimes(1);
      expect(ctx.fillText).toHaveBeenCalledWith('ABCD', 0, 0);
      expect(ctx.translate).toHaveBeenCalledWith(W / 2, H / 2);
    });

    it('applies rotation in radians', () => {
      const ctx = draw(params({ rotate: 90 }));
      expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
    });

    it('positions top-left with margin equal to font size', () => {
      const ctx = draw(params({ pos: 'top-left' }));
      // x = margin(20) + textW/2(20), y = margin(20) + fontSize/2(10)
      expect(ctx.translate).toHaveBeenCalledWith(40, 30);
    });

    it('positions bottom-right with margin equal to font size', () => {
      const ctx = draw(params({ pos: 'bottom-right' }));
      // x = 400 - 20 - 20, y = 200 - 20 - 10
      expect(ctx.translate).toHaveBeenCalledWith(360, 170);
    });

    it('customPos overrides preset position', () => {
      const ctx = draw(params({ pos: 'top-left', customPos: { x: 0.25, y: 0.5 } }));
      expect(ctx.translate).toHaveBeenCalledWith(100, 100);
    });

    it('draws a grid of rotated copies in tiled mode', () => {
      const ctx = draw(params({ mode: 'tiled', gap: 100 }));
      // gapPx = 1 * 20 * 4 = 80 ; cols = ceil(400/80)+2 = 7 ; rows = ceil(200/80)+2 = 5
      // loops i in [-1, cols), j in [-1, rows) => 8 * 6
      expect(ctx.fillText).toHaveBeenCalledTimes(8 * 6);
    });

    it('offsets odd rows by half a gap in tiled mode', () => {
      const ctx = draw(params({ mode: 'tiled', gap: 100 }));
      const calls = ctx.translate.mock.calls as number[][];
      // i=0: row j=0 => (0,0); row j=1 => (0 + 40, 80)
      expect(calls).toContainEqual([0, 0]);
      expect(calls).toContainEqual([40, 80]);
    });

    it('clips with evenodd when a mask is provided', () => {
      const ctx = draw(params({ mask: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } }));
      expect(ctx.rect).toHaveBeenNthCalledWith(1, 0, 0, W, H);
      expect(ctx.rect).toHaveBeenNthCalledWith(2, 40, 40, 200, 100);
      expect(ctx.clip).toHaveBeenCalledWith('evenodd');
    });

    it('does not clip without a mask', () => {
      const ctx = draw(params());
      expect(ctx.clip).not.toHaveBeenCalled();
    });

    it('balances save and restore', () => {
      const single = draw(params());
      expect(single.restore).toHaveBeenCalledTimes(single.save.mock.calls.length);
      const tiled = draw(params({ mode: 'tiled' }));
      expect(tiled.restore).toHaveBeenCalledTimes(tiled.save.mock.calls.length);
    });
  });

  describe('processAll', () => {
    const imgFile = (name: string, type = 'image/png') => new File(['x'], name, { type });

    let zipFile: ReturnType<typeof vi.fn>;
    let zipGenerate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      zipFile = vi.fn();
      zipGenerate = vi.fn().mockResolvedValue(new Blob(['zip']));
      (globalThis as any).JSZip = function () {
        return { file: zipFile, generateAsync: zipGenerate };
      };
      vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      delete (globalThis as any).JSZip;
      vi.restoreAllMocks();
    });

    it('does nothing when there are no files', async () => {
      const status = vi.fn();
      const save = vi.spyOn(service, 'saveFile');
      await service.processAll(status);
      expect(status).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('saves a single image directly with the chosen output name', async () => {
      state.files.set([imgFile('a.png')]);
      state.outputFileName.set('result');
      state.outputFormat.set('auto');
      const blob = new Blob(['img'], { type: 'image/png' });
      vi.spyOn(service, 'processImage').mockResolvedValue(blob);
      const save = vi.spyOn(service, 'saveFile').mockResolvedValue('result.png');

      const status = vi.fn();
      await service.processAll(status);

      expect(save).toHaveBeenCalledWith(blob, 'result.png', 'png');
      expect(zipGenerate).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith('正在處理 (1/1): a.png');
      expect(status).toHaveBeenLastCalledWith('');
    });

    it('maps image/jpeg to .jpg extension in auto mode', async () => {
      state.files.set([imgFile('a.jpeg', 'image/jpeg')]);
      vi.spyOn(service, 'processImage').mockResolvedValue(new Blob(['i'], { type: 'image/jpeg' }));
      const save = vi.spyOn(service, 'saveFile').mockResolvedValue('x.jpg');

      await service.processAll(vi.fn());

      expect(save.mock.calls[0][1]).toMatch(/\.jpg$/);
    });

    it('forces the requested mime type when converting formats', async () => {
      state.files.set([imgFile('a.png')]);
      state.outputFormat.set('jpg');
      const proc = vi
        .spyOn(service, 'processImage')
        .mockResolvedValue(new Blob(['i'], { type: 'image/jpeg' }));
      vi.spyOn(service, 'saveFile').mockResolvedValue('x.jpg');

      await service.processAll(vi.fn());

      expect(proc.mock.calls[0][2]).toBe('image/jpeg');
    });

    it('zips multiple files and names entries with _wm suffix', async () => {
      state.files.set([imgFile('a.png'), imgFile('b.png')]);
      state.outputFileName.set('batch');
      vi.spyOn(service, 'processImage').mockResolvedValue(new Blob(['i'], { type: 'image/png' }));
      const save = vi.spyOn(service, 'saveFile').mockResolvedValue('batch.zip');

      const status = vi.fn();
      await service.processAll(status);

      expect(zipFile).toHaveBeenCalledTimes(2);
      expect(zipFile.mock.calls.map((c) => c[0])).toEqual(['a_wm.png', 'b_wm.png']);
      expect(status).toHaveBeenCalledWith('打包壓縮中...');
      expect(save.mock.calls[0][1]).toBe('batch.zip');
      expect(save.mock.calls[0][2]).toBe('zip');
    });

    it('splits a PDF into per-page images with zero-padded names', async () => {
      state.files.set([new File(['p'], 'doc.pdf', { type: 'application/pdf' })]);
      state.outputFormat.set('png');
      vi.spyOn(service, 'processPdfToImages').mockResolvedValue([
        new Blob(['1'], { type: 'image/png' }),
        new Blob(['2'], { type: 'image/png' }),
      ]);
      const save = vi.spyOn(service, 'saveFile').mockResolvedValue('out.zip');

      await service.processAll(vi.fn());

      expect(zipFile.mock.calls.map((c) => c[0])).toEqual(['doc_page_01.png', 'doc_page_02.png']);
      // multiple outputs => zip, not single-file save
      expect(save.mock.calls[0][2]).toBe('zip');
    });

    it('keeps a PDF as PDF when no image format is requested', async () => {
      state.files.set([new File(['p'], 'doc.pdf', { type: 'application/pdf' })]);
      state.outputFormat.set('auto');
      const blob = new Blob(['pdf'], { type: 'application/pdf' });
      const proc = vi.spyOn(service, 'processPDF').mockResolvedValue(blob);
      const save = vi.spyOn(service, 'saveFile').mockResolvedValue('x.pdf');

      await service.processAll(vi.fn());

      expect(proc).toHaveBeenCalled();
      expect(save.mock.calls[0][1]).toMatch(/\.pdf$/);
    });

    it('wraps an image into a PDF when output format is pdf', async () => {
      state.files.set([imgFile('a.png')]);
      state.outputFormat.set('pdf');
      const proc = vi.spyOn(service, 'processImage').mockResolvedValue(new Blob(['i']));
      const wrap = vi
        .spyOn(service, 'createPdfFromImage')
        .mockResolvedValue(new Blob(['p'], { type: 'application/pdf' }));
      vi.spyOn(service, 'saveFile').mockResolvedValue('x.pdf');

      await service.processAll(vi.fn());

      expect(proc.mock.calls[0][2]).toBe('image/jpeg');
      expect(wrap).toHaveBeenCalled();
    });

    it('uses per-file saved params in independent mode', async () => {
      state.files.set([imgFile('a.png'), imgFile('b.png')]);
      state.applyMode.set('independent');
      state.activeIndex.set(0);
      state.watermarkText.set('ACTIVE');
      state.savedParams.set([params({ text: 'old-a' }), params({ text: 'saved-b' })]);
      const proc = vi.spyOn(service, 'processImage').mockResolvedValue(new Blob(['i']));
      vi.spyOn(service, 'saveFile').mockResolvedValue('x.zip');

      await service.processAll(vi.fn());

      // active file uses live signals, the other uses its saved params
      expect(proc.mock.calls[0][1].text).toBe('ACTIVE');
      expect(proc.mock.calls[1][1].text).toBe('saved-b');
    });

    it('uses the same params for every file in unified mode', async () => {
      state.files.set([imgFile('a.png'), imgFile('b.png')]);
      state.applyMode.set('unified');
      state.watermarkText.set('SAME');
      const proc = vi.spyOn(service, 'processImage').mockResolvedValue(new Blob(['i']));
      vi.spyOn(service, 'saveFile').mockResolvedValue('x.zip');

      await service.processAll(vi.fn());

      expect(proc.mock.calls.map((c) => c[1].text)).toEqual(['SAME', 'SAME']);
    });

    it('does not alert when the user cancels the save dialog', async () => {
      state.files.set([imgFile('a.png')]);
      vi.spyOn(service, 'processImage').mockResolvedValue(new Blob(['i'], { type: 'image/png' }));
      vi.spyOn(service, 'saveFile').mockResolvedValue(false);

      await service.processAll(vi.fn());

      expect(window.alert).not.toHaveBeenCalled();
    });

    it('reports the error through the callback and rethrows', async () => {
      state.files.set([imgFile('a.png')]);
      vi.spyOn(service, 'processImage').mockRejectedValue(new Error('boom'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const status = vi.fn();
      await expect(service.processAll(status)).rejects.toThrow('boom');
      expect(status).toHaveBeenLastCalledWith('發生錯誤: boom');
    });
  });

  describe('processImage', () => {
    let created: any[];
    const realImage = globalThis.Image;

    beforeEach(() => {
      created = [];
      (URL as any).createObjectURL = vi.fn(() => 'blob:img');
      (URL as any).revokeObjectURL = vi.fn();
      (globalThis as any).Image = function () {
        const img: any = { width: 10, height: 10 };
        created.push(img);
        return img;
      };
    });

    afterEach(() => {
      (globalThis as any).Image = realImage;
      vi.restoreAllMocks();
    });

    it('rejects and revokes the object URL when the image fails to load', async () => {
      const pending = service.processImage(new File(['x'], 'bad.png', { type: 'image/png' }), params(), null);
      created[0].onerror();
      await expect(pending).rejects.toThrow('無法載入圖片: bad.png');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:img');
    });

    it('revokes the object URL after a successful load', async () => {
      const ctx = makeCtx();
      const canvas = {
        getContext: () => ctx,
        width: 0,
        height: 0,
        toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['ok'])),
      };
      const realCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
        tag === 'canvas' ? (canvas as any) : realCreate(tag)
      );
      (ctx as any).drawImage = vi.fn();

      const pending = service.processImage(new File(['x'], 'ok.png', { type: 'image/png' }), params(), null);
      created[0].onload();
      await expect(pending).resolves.toBeInstanceOf(Blob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:img');
    });

    it('rejects when the canvas cannot produce a blob', async () => {
      const ctx: any = makeCtx();
      ctx.drawImage = vi.fn();
      const canvas = { getContext: () => ctx, toBlob: (cb: (b: Blob | null) => void) => cb(null) };
      const realCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
        tag === 'canvas' ? (canvas as any) : realCreate(tag)
      );

      const pending = service.processImage(new File(['x'], 'big.png', { type: 'image/png' }), params(), null);
      created[0].onload();
      await expect(pending).rejects.toThrow('無法輸出圖片: big.png');
    });
  });

  describe('saveFile', () => {
    afterEach(() => {
      delete (window as any).showSaveFilePicker;
      vi.restoreAllMocks();
    });

    function stubDownload() {
      (URL as any).createObjectURL = vi.fn(() => 'blob:fake');
      (URL as any).revokeObjectURL = vi.fn();
      const click = vi.fn();
      const realCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = realCreate(tag);
        if (tag === 'a') (el as HTMLAnchorElement).click = click;
        return el;
      });
      return click;
    }

    it('falls back to an anchor download without the File System Access API', async () => {
      const click = stubDownload();
      const name = await service.saveFile(new Blob(['x']), 'out.png', 'png');
      expect(name).toBe('out.png');
      expect(click).toHaveBeenCalled();
    });

    it('writes through showSaveFilePicker when available', async () => {
      const write = vi.fn();
      const close = vi.fn();
      const picker = vi.fn().mockResolvedValue({
        name: 'chosen.pdf',
        createWritable: async () => ({ write, close }),
      });
      (window as any).showSaveFilePicker = picker;
      const blob = new Blob(['x']);

      const name = await service.saveFile(blob, 'out.pdf', 'pdf');

      expect(name).toBe('chosen.pdf');
      expect(picker.mock.calls[0][0].suggestedName).toBe('out.pdf');
      expect(picker.mock.calls[0][0].types[0].accept).toHaveProperty('application/pdf');
      expect(write).toHaveBeenCalledWith(blob);
      expect(close).toHaveBeenCalled();
    });

    it('returns false when the picker is cancelled', async () => {
      const err = new Error('cancel');
      err.name = 'AbortError';
      (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(err);
      expect(await service.saveFile(new Blob(['x']), 'out.zip', 'zip')).toBe(false);
    });

    it('falls back to download when the picker fails for another reason', async () => {
      (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(new Error('denied'));
      const click = stubDownload();
      const name = await service.saveFile(new Blob(['x']), 'out.zip', 'zip');
      expect(name).toBe('out.zip');
      expect(click).toHaveBeenCalled();
    });
  });
});
