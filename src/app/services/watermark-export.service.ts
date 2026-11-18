import { Injectable, inject, signal } from '@angular/core';
import { parsePageRange } from './page-range';
import { loadPdfjs } from './pdfjs-loader';
import { getFontCss, getFontSize, getSingleAnchor } from './watermark-layout';
import { WatermarkStateService, WatermarkParams } from './watermark-state.service';

export interface PdfExportOptions {
  /** 要加浮水印的頁碼，如 "1,3,5-8"；空字串或未提供代表全部頁 */
  pageRange?: string;
  /** 輸出解析度倍率，預設 2 */
  scale?: number;
  /** 進度回報：目前是第幾個被處理的頁面 / 共幾頁 */
  onPage?: (page: number, total: number) => void;
}

@Injectable({
  providedIn: 'root'
})
export class WatermarkExportService {
  stateService = inject(WatermarkStateService);

  applyWatermarkToCanvas(targetCtx: CanvasRenderingContext2D, width: number, height: number, p: WatermarkParams) {
    const fontSize = getFontSize(width, p.size);

    targetCtx.save();

    if (p.mask) {
      targetCtx.beginPath();
      targetCtx.rect(0, 0, width, height);
      const mx = p.mask.x * width;
      const my = p.mask.y * height;
      const mw = p.mask.w * width;
      const mh = p.mask.h * height;
      targetCtx.rect(mx, my, mw, mh);
      targetCtx.clip('evenodd');
    }

    targetCtx.font = getFontCss(fontSize, p.font);
    targetCtx.fillStyle = p.color;
    targetCtx.globalAlpha = p.opacity;
    targetCtx.textBaseline = 'middle';
    targetCtx.textAlign = 'center';

    if (p.mode === 'single') {
      const textW = targetCtx.measureText(p.text).width;
      const { x, y } = getSingleAnchor(width, height, fontSize, textW, p.pos, p.customPos);

      targetCtx.translate(x, y);
      targetCtx.rotate((p.rotate * Math.PI) / 180);
      targetCtx.fillText(p.text, 0, 0);
    } else {
      const gapPx = (p.gap / 100) * fontSize * 4;
      const cols = Math.ceil(width / gapPx) + 2;
      const rows = Math.ceil(height / gapPx) + 2;
      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          const x = i * gapPx;
          const y = j * gapPx;
          const xOffset = (j % 2 !== 0) ? gapPx / 2 : 0;
          targetCtx.save();
          targetCtx.translate(x + xOffset, y);
          targetCtx.rotate((p.rotate * Math.PI) / 180);
          targetCtx.fillText(p.text, 0, 0);
          targetCtx.restore();
        }
      }
    }
    targetCtx.restore();
    targetCtx.globalAlpha = 1.0;
  }

  /** 匯出進行中與狀態文字：匯出面板與預覽區的浮動匯出鈕共用 */
  isProcessing = signal(false);
  statusMsg = signal('');

  /** 帶有共用進度狀態的匯出入口 */
  async runExport(): Promise<void> {
    if (this.isProcessing()) return;
    this.isProcessing.set(true);
    this.statusMsg.set('');
    try {
      await this.processAll((msg) => this.statusMsg.set(msg));
    } catch {
      // 錯誤已在 processAll 內處理
    } finally {
      this.isProcessing.set(false);
    }
  }

  async processAll(statusCallback: (msg: string) => void): Promise<void> {
    const files = this.stateService.files();
    if (files.length === 0) return;

    let outName = this.stateService.outputFileName() || 'watermarked_output';
    const outFormat = this.stateService.outputFormat();
    const p = this.stateService.getParams();

    try {
      // 打包與 PDF 函式庫只在匯出時才下載，不佔首次載入
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      let singleResultBlob: Blob | null = null;
      let singleResultExt = '';
      let totalOutputCount = 0;
      const outputFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        statusCallback(`正在處理 (${i + 1}/${files.length}): ${file.name}`);

        const pdfOptions: PdfExportOptions = {
          pageRange: this.stateService.pageRange(),
          scale: this.stateService.exportScale(),
          onPage: (page, total) => {
            if (total > 1) {
              statusCallback(`正在處理 (${i + 1}/${files.length}): ${file.name} - 第 ${page}/${total} 頁`);
            }
          },
        };

        let currentParams = p;
        if (this.stateService.applyMode() === 'independent') {
          // If exporting the active index, use current signals to catch latest unsaved changes.
          if (i === this.stateService.activeIndex()) {
             currentParams = this.stateService.getParams();
          } else {
             currentParams = this.stateService.savedParams()[i] || p;
          }
        }

        if (file.type === 'application/pdf') {
          if (outFormat === 'png' || outFormat === 'jpg') {
            const mime = outFormat === 'jpg' ? 'image/jpeg' : 'image/png';
            const results = await this.processPdfToImages(file, currentParams, mime, pdfOptions);
            results.forEach(({ page, blob }) => {
              const nameParts = file.name.split('.');
              nameParts.pop();
              const pageNum = page.toString().padStart(2, '0');
              const fileName = `${nameParts.join('.')}_page_${pageNum}.${outFormat}`;
              zip.file(fileName, blob);
              outputFiles.push(new File([blob], fileName, { type: blob.type }));
            });
            totalOutputCount += results.length;
          } else {
            const blob = await this.processPDF(file, currentParams, pdfOptions);
            const nameParts = file.name.split('.');
            nameParts.pop();
            const fileName = `${nameParts.join('.')}_wm.pdf`;
            zip.file(fileName, blob);
            outputFiles.push(new File([blob], fileName, { type: blob.type }));
            if (files.length === 1) {
              singleResultBlob = blob;
              singleResultExt = 'pdf';
            }
            totalOutputCount++;
          }
        } else {
          let ext = '', blob: Blob;
          if (outFormat === 'pdf') {
            const imgBlob = await this.processImage(file, currentParams, 'image/jpeg');
            blob = await this.createPdfFromImage(imgBlob);
            ext = 'pdf';
          } else {
            let mimeType = file.type;
            if (outFormat === 'jpg') mimeType = 'image/jpeg';
            if (outFormat === 'png') mimeType = 'image/png';
            blob = await this.processImage(file, currentParams, mimeType);
            if (outFormat !== 'auto') ext = outFormat;
            else ext = file.type.split('/')[1];
            if (ext === 'jpeg') ext = 'jpg';
          }
          const nameParts = file.name.split('.');
          nameParts.pop();
          const fileName = `${nameParts.join('.')}_wm.${ext}`;
          zip.file(fileName, blob);
          outputFiles.push(new File([blob], fileName, { type: blob.type }));
          if (files.length === 1) {
            singleResultBlob = blob;
            singleResultExt = ext;
          }
          totalOutputCount++;
        }
      }

      if (files.length === 1 && totalOutputCount === 1 && singleResultBlob) {
        const finalName = await this.saveFile(singleResultBlob, `${outName}.${singleResultExt}`, singleResultExt);
        if (finalName) alert(`檔案 ${finalName} 匯出成功！`);
      } else {
        statusCallback('打包壓縮中...');
        const content = await zip.generateAsync({ type: 'blob' });
        const finalName = await this.saveFile(content, `${outName}.zip`, 'zip');
        if (finalName) alert(`檔案 ${finalName} 匯出成功！`);
      }
      statusCallback('');
    } catch (error: any) {
      console.error(error);
      statusCallback(`發生錯誤: ${error.message}`);
      throw error;
    }
  }

  async processPdfToImages(
    file: File,
    p: WatermarkParams,
    mimeType: string,
    options: PdfExportOptions = {}
  ): Promise<{ page: number; blob: Blob }[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await loadPdfjs();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const outputs: { page: number; blob: Blob }[] = [];
    try {
      // 每一頁都會輸出，但只有選取的頁面會加浮水印
      const selected = new Set(this.resolvePages(options.pageRange, pdf.numPages));
      const scale = options.scale ?? 2;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        options.onPage?.(pageNum, pdf.numPages);
        await this.yieldToUi();
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (selected.has(pageNum)) {
          this.applyWatermarkToCanvas(context, canvas.width, canvas.height, p);
        }
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), mimeType, 0.9);
        });
        outputs.push({ page: pageNum, blob });
        // 釋放這頁佔用的記憶體
        page.cleanup();
        canvas.width = canvas.height = 0;
      }
    } finally {
      await pdf.loadingTask.destroy();
    }
    return outputs;
  }

  async createPdfFromImage(imgBlob: Blob): Promise<Blob> {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const imgBytes = await imgBlob.arrayBuffer();
    let imgEmbed;
    if (imgBlob.type === 'image/png') imgEmbed = await pdfDoc.embedPng(imgBytes);
    else imgEmbed = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([imgEmbed.width, imgEmbed.height]);
    page.drawImage(imgEmbed, { x: 0, y: 0, width: imgEmbed.width, height: imgEmbed.height });
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  }

  processImage(file: File, p: WatermarkParams, mimeType: string | null): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const c = document.createElement('canvas');
        const x = c.getContext('2d')!;
        c.width = img.width;
        c.height = img.height;
        x.drawImage(img, 0, 0);
        this.applyWatermarkToCanvas(x, c.width, c.height, p);
        const outputType = mimeType || file.type;
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error(`無法輸出圖片: ${file.name}`))),
          outputType,
          0.9
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`無法載入圖片: ${file.name}`));
      };
      img.src = url;
    });
  }

  async processPDF(file: File, p: WatermarkParams, options: PdfExportOptions = {}): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    // 未選取的頁面維持原樣，只對選取的頁面加浮水印
    const selected = this.resolvePages(options.pageRange, pages.length);
    const scale = options.scale ?? 2;
    for (let n = 0; n < selected.length; n++) {
      options.onPage?.(n + 1, selected.length);
      await this.yieldToUi();
      const page = pages[selected[n] - 1];
      const { width, height } = page.getSize();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      this.applyWatermarkToCanvas(ctx, canvas.width, canvas.height, p);
      const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
      const pngImageBytes = await pngBlob.arrayBuffer();
      const embeddedImage = await pdfDoc.embedPng(pngImageBytes);
      page.drawImage(embeddedImage, { x: 0, y: 0, width: width, height: height });
    }
    const saved = await pdfDoc.save();
    return new Blob([saved as BlobPart], { type: 'application/pdf' });
  }

  private resolvePages(range: string | undefined, total: number): number[] {
    const result = parsePageRange(range ?? '', total);
    if ('error' in result) throw new Error(`頁碼範圍錯誤：${result.error}`);
    return result.pages;
  }

  /** 讓出主執行緒一個回合，使進度文字能被瀏覽器繪製 */
  private yieldToUi(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve));
  }

  async saveFile(blob: Blob, suggestedName: string, ext: string): Promise<string | false> {
    if ('showSaveFilePicker' in window) {
      try {
        const types: any[] = [];
        if (ext === 'pdf') types.push({ description: 'PDF 文件', accept: { 'application/pdf': ['.pdf'] } });
        else if (ext === 'zip') types.push({ description: 'ZIP 壓縮檔', accept: { 'application/zip': ['.zip'] } });
        else if (ext === 'jpg') types.push({ description: 'JPG 圖片', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } });
        else if (ext === 'png') types.push({ description: 'PNG 圖片', accept: { 'image/png': ['.png'] } });
        else types.push({ description: '檔案', accept: { '*/*': ['.' + ext] } });
        const handle = await (window as any).showSaveFilePicker({ suggestedName, types });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return handle.name;
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return suggestedName;
  }
}
