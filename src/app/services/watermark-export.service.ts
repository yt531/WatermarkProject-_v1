import { Injectable, inject } from '@angular/core';
import { WatermarkStateService, WatermarkParams } from './watermark-state.service';

declare const JSZip: any;
declare const pdfjsLib: any;
declare const PDFLib: any;

@Injectable({
  providedIn: 'root'
})
export class WatermarkExportService {
  stateService = inject(WatermarkStateService);

  applyWatermarkToCanvas(targetCtx: CanvasRenderingContext2D, width: number, height: number, p: WatermarkParams) {
    const basePx = width / 20;
    const fontSize = basePx * (p.size / 50);

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

    targetCtx.font = `bold ${fontSize}px "${p.font}"`;
    targetCtx.fillStyle = p.color;
    targetCtx.globalAlpha = p.opacity;
    targetCtx.textBaseline = 'middle';
    targetCtx.textAlign = 'center';

    if (this.stateService.watermarkMode() === 'single') {
      const textW = targetCtx.measureText(p.text).width;
      let x = 0, y = 0;
      const parts = p.pos.split('-');
      const v = parts[0];
      const h = parts[1];
      const margin = fontSize;

      if (p.customPos) {
        x = p.customPos.x;
        y = p.customPos.y;
      } else {
        if (h === 'left') x = margin + textW / 2;
        else if (h === 'right') x = width - margin - textW / 2;
        else x = width / 2;

        if (v === 'top') y = margin + fontSize / 2;
        else if (v === 'bottom') y = height - margin - fontSize / 2;
        else y = height / 2;
      }

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

  async processAll(statusCallback: (msg: string) => void): Promise<void> {
    const files = this.stateService.files();
    if (files.length === 0) return;

    let outName = this.stateService.outputFileName() || 'watermarked_output';
    const outFormat = this.stateService.outputFormat();
    const p = this.stateService.getParams();

    try {
      const zip = new JSZip();
      let singleResultBlob: Blob | null = null;
      let singleResultExt = '';
      let totalOutputCount = 0;
      const outputFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        statusCallback(`正在處理 (${i + 1}/${files.length}): ${file.name}`);

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
            const blobs = await this.processPdfToImages(file, currentParams, mime);
            blobs.forEach((blob, index) => {
              const nameParts = file.name.split('.');
              nameParts.pop();
              const pageNum = (index + 1).toString().padStart(2, '0');
              const fileName = `${nameParts.join('.')}_page_${pageNum}.${outFormat}`;
              zip.file(fileName, blob);
              outputFiles.push(new File([blob], fileName, { type: blob.type }));
            });
            totalOutputCount += blobs.length;
          } else {
            const blob = await this.processPDF(file, currentParams);
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

      const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      let shareSucceeded = false;

      if (isMobile && navigator.canShare && navigator.canShare({ files: outputFiles })) {
        try {
          statusCallback('正在喚起系統分享...');
          await navigator.share({
            files: outputFiles,
            title: '匯出的浮水印檔案'
          });
          statusCallback('儲存/分享完成！');
          shareSucceeded = true;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            statusCallback('已取消分享。');
            shareSucceeded = true; // Prevent fallback if intentionally cancelled
          } else {
            console.warn('Native share failed, falling back to download:', error);
          }
        }
      }

      if (!shareSucceeded) {
        if (files.length === 1 && totalOutputCount === 1 && singleResultBlob) {
          await this.saveFile(singleResultBlob, `${outName}.${singleResultExt}`, singleResultExt);
        } else {
          statusCallback('打包壓縮中...');
          const content = await zip.generateAsync({ type: 'blob' });
          await this.saveFile(content, `${outName}.zip`, 'zip');
        }
        statusCallback('完成！');
      }
    } catch (error: any) {
      console.error(error);
      statusCallback(`發生錯誤: ${error.message}`);
      throw error;
    }
  }

  async processPdfToImages(file: File, p: WatermarkParams, mimeType: string): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const outputBlobs: Blob[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      this.applyWatermarkToCanvas(context, canvas.width, canvas.height, p);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), mimeType, 0.9);
      });
      outputBlobs.push(blob);
    }
    return outputBlobs;
  }

  async createPdfFromImage(imgBlob: Blob): Promise<Blob> {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const imgBytes = await imgBlob.arrayBuffer();
    let imgEmbed;
    if (imgBlob.type === 'image/png') imgEmbed = await pdfDoc.embedPng(imgBytes);
    else imgEmbed = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([imgEmbed.width, imgEmbed.height]);
    page.drawImage(imgEmbed, { x: 0, y: 0, width: imgEmbed.width, height: imgEmbed.height });
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  processImage(file: File, p: WatermarkParams, mimeType: string | null): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement('canvas');
        const x = c.getContext('2d')!;
        c.width = img.width;
        c.height = img.height;
        x.drawImage(img, 0, 0);
        this.applyWatermarkToCanvas(x, c.width, c.height, p);
        const outputType = mimeType || file.type;
        c.toBlob((b) => resolve(b!), outputType, 0.9);
      };
    });
  }

  async processPDF(file: File, p: WatermarkParams): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = width;
      canvas.height = height;
      this.applyWatermarkToCanvas(ctx, width, height, p);
      const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
      const pngImageBytes = await pngBlob.arrayBuffer();
      const embeddedImage = await pdfDoc.embedPng(pngImageBytes);
      page.drawImage(embeddedImage, { x: 0, y: 0, width: width, height: height });
    }
    const saved = await pdfDoc.save();
    return new Blob([saved], { type: 'application/pdf' });
  }

  async saveFile(blob: Blob, suggestedName: string, ext: string) {
    if ('showSaveFilePicker' in window) {
      try {
        const types: any[] = [];
        if (ext === 'pdf') types.push({ description: 'PDF 文件', accept: { 'application/pdf': ['.pdf'] } });
        else if (ext === 'zip') types.push({ description: 'ZIP 壓縮檔', accept: { 'application/zip': ['.zip'] } });
        else if (ext === 'jpg') types.push({ description: 'JPG 圖片', accept: { 'image/jpeg': ['.jpg'] } });
        else if (ext === 'png') types.push({ description: 'PNG 圖片', accept: { 'image/png': ['.png'] } });
        else types.push({ description: '檔案', accept: { '*/*': ['.' + ext] } });
        const handle = await (window as any).showSaveFilePicker({ suggestedName, types });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
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
  }
}
