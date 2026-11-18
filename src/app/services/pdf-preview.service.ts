import { Injectable } from '@angular/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfjs } from './pdfjs-loader';

const PREVIEW_SCALE = 1.5;
/** 每個檔案最多快取幾頁預覽圖，避免大型 PDF 吃掉記憶體 */
const MAX_CACHED_PAGES = 5;

/**
 * 管理 PDF 預覽：保留已開啟的文件，翻到哪一頁才渲染哪一頁。
 */
@Injectable({ providedIn: 'root' })
export class PdfPreviewService {
  private docs = new WeakMap<File, Promise<PDFDocumentProxy>>();
  private pageCache = new WeakMap<File, Map<number, string>>();

  private open(file: File): Promise<PDFDocumentProxy> {
    let doc = this.docs.get(file);
    if (!doc) {
      doc = (async () => {
        const pdfjsLib = await loadPdfjs();
        const data = new Uint8Array(await file.arrayBuffer());
        return pdfjsLib.getDocument({ data }).promise;
      })();
      // 開啟失敗時不要留下壞掉的 Promise，之後才能重試
      doc.catch(() => this.docs.delete(file));
      this.docs.set(file, doc);
    }
    return doc;
  }

  async getPageCount(file: File): Promise<number> {
    return (await this.open(file)).numPages;
  }

  /** 渲染指定頁（從 1 開始），回傳 JPEG data URL */
  async renderPage(file: File, pageNum: number): Promise<string> {
    let cache = this.pageCache.get(file);
    if (!cache) {
      cache = new Map();
      this.pageCache.set(file, cache);
    }
    const hit = cache.get(pageNum);
    if (hit) return hit;

    const pdf = await this.open(file);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: PREVIEW_SCALE });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const url = canvas.toDataURL('image/jpeg');
    page.cleanup();
    canvas.width = canvas.height = 0;

    cache.set(pageNum, url);
    if (cache.size > MAX_CACHED_PAGES) {
      cache.delete(cache.keys().next().value!);
    }
    return url;
  }
}
