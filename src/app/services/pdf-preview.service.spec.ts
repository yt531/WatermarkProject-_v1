import { TestBed } from '@angular/core/testing';
import { PdfPreviewService } from './pdf-preview.service';

const pdfjs = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument: pdfjs.getDocument, GlobalWorkerOptions: {} }));

function fakePdf(numPages: number) {
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const getPage = vi.fn(async () => ({
    getViewport: () => ({ width: 30, height: 40 }),
    render,
    cleanup: vi.fn(),
  }));
  return { numPages, getPage, render };
}

describe('PdfPreviewService', () => {
  let service: PdfPreviewService;
  let pdf: ReturnType<typeof fakePdf>;
  const file = () => new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    pdf = fakePdf(8);
    pdfjs.getDocument.mockReset().mockReturnValue({ promise: Promise.resolve(pdf) });
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfPreviewService);
    // jsdom 沒有 canvas 實作，這裡只需要 toDataURL 有值
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'canvas'
        ? ({ getContext: () => ({}), toDataURL: () => 'data:image/jpeg;base64,X', width: 0, height: 0 })
        : Document.prototype.createElement.call(document, tag)) as any);
  });

  afterEach(() => vi.restoreAllMocks());

  it('reports the page count', async () => {
    expect(await service.getPageCount(file())).toBe(8);
  });

  it('opens each file only once', async () => {
    const f = file();
    await service.getPageCount(f);
    await service.renderPage(f, 1);
    await service.renderPage(f, 2);
    expect(pdfjs.getDocument).toHaveBeenCalledTimes(1);
  });

  it('serves a repeated page from cache', async () => {
    const f = file();
    await service.renderPage(f, 3);
    await service.renderPage(f, 3);
    expect(pdf.getPage).toHaveBeenCalledTimes(1);
  });

  it('evicts the oldest page beyond the cache limit', async () => {
    const f = file();
    for (let n = 1; n <= 6; n++) await service.renderPage(f, n); // 上限 5 頁，第 1 頁被擠掉
    pdf.getPage.mockClear();
    await service.renderPage(f, 6);
    expect(pdf.getPage).not.toHaveBeenCalled();
    await service.renderPage(f, 1);
    expect(pdf.getPage).toHaveBeenCalledWith(1);
  });

  it('allows retrying after the document fails to open', async () => {
    const f = file();
    pdfjs.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error('bad pdf')) });
    await expect(service.getPageCount(f)).rejects.toThrow('bad pdf');
    expect(await service.getPageCount(f)).toBe(8);
  });
});
