import { Component, ElementRef, ViewChild, effect, inject, signal, AfterViewInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WatermarkStateService, WatermarkParams } from '../../services/watermark-state.service';
import { WatermarkExportService } from '../../services/watermark-export.service';
import { PdfPreviewService } from '../../services/pdf-preview.service';
import {
  clampAnchorToCanvas,
  getFontCss,
  getFontSize,
  getSingleAnchor,
  isPointOnText,
} from '../../services/watermark-layout';
import {
  DOUBLE_TAP_SCALE,
  INITIAL_ZOOM,
  Point,
  ZoomState,
  distance,
  midpoint,
  panBy,
  toTransform,
  zoomAt,
} from '../../services/zoom-pan';

/** 全螢幕高解析圖：PDF 的渲染倍率（A4 約 1785×2526），圖片的長邊上限 */
const HIRES_PDF_SCALE = 3;
const HIRES_MAX_SIDE = 3000;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;
import { SafeZoneBoxComponent } from '../safe-zone-box/safe-zone-box';
import { FileUploaderComponent } from '../file-uploader/file-uploader';

@Component({
  selector: 'app-preview-pane',
  standalone: true,
  imports: [SafeZoneBoxComponent, FileUploaderComponent, DecimalPipe],
  templateUrl: './preview-pane.html'
})
export class PreviewPaneComponent implements AfterViewInit {
  stateService = inject(WatermarkStateService);
  exportService = inject(WatermarkExportService);
  pdfPreview = inject(PdfPreviewService);
  @ViewChild('previewCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fullscreenDialog') dialogRef!: ElementRef<HTMLDialogElement>;

  private previewImg = new Image();
  isFullscreen = signal(false);
  isPageLoading = signal(false);

  // 全螢幕縮放狀態
  zoom = signal<ZoomState>(INITIAL_ZOOM);
  isHiResLoading = signal(false);
  private pointers = new Map<number, Point>();
  private pinchPrev: { dist: number; mid: Point } | null = null;
  private tapCandidate = false;
  private tapStart: Point = { x: 0, y: 0 };
  private lastTap = { time: 0, x: 0, y: 0 };
  private hiResUrl: string | null = null;
  private fullscreenToken = 0;
  pageError = signal(false);
  modalImageSrc = signal('');

  isDragging = false;
  lastMouseX = 0;
  lastMouseY = 0;

  ngAfterViewInit() {
    this.initEmptyCanvas();
  }

  async openFullscreen() {
    if (!this.canvasRef || !this.dialogRef) return;
    this.resetZoom();
    // 先立刻顯示目前預覽畫布的內容，再於背景換成高解析版本
    this.modalImageSrc.set(this.canvasRef.nativeElement.toDataURL('image/png'));
    this.isFullscreen.set(true);
    this.dialogRef.nativeElement.showModal();

    const token = ++this.fullscreenToken;
    this.isHiResLoading.set(true);
    try {
      const url = await this.buildHighResUrl();
      if (url && this.isFullscreen() && token === this.fullscreenToken) {
        this.releaseHiRes();
        this.hiResUrl = url;
        this.modalImageSrc.set(url);
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e); // 高解析版失敗時維持原本的預覽圖即可
    } finally {
      if (token === this.fullscreenToken) this.isHiResLoading.set(false);
    }
  }

  closeFullscreen() {
    // 會觸發 dialog 的 close 事件，由 onFullscreenClosed 收尾（Esc 鍵關閉也走同一條路）
    this.dialogRef?.nativeElement.close();
  }

  onFullscreenClosed() {
    this.fullscreenToken++;
    this.isFullscreen.set(false);
    this.isHiResLoading.set(false);
    this.releaseHiRes();
    this.resetZoom();
    // Redraw the canvas on the next frame to prevent the canvas from becoming blank on mobile browsers
    // (due to canvas context loss or memory reclamation when displaying large base64 images).
    requestAnimationFrame(() => this.drawCanvas());
  }

  private releaseHiRes() {
    if (this.hiResUrl) URL.revokeObjectURL(this.hiResUrl);
    this.hiResUrl = null;
  }

  /** 以高解析度重畫目前頁面並套上浮水印，回傳 blob URL；無法產生時回傳 null */
  private async buildHighResUrl(): Promise<string | null> {
    const state = this.stateService;
    const file = state.files()[state.activeIndex()];
    let canvas: HTMLCanvasElement;

    if (state.activeIsPdf() && file) {
      canvas = await this.pdfPreview.renderPageToCanvas(file, state.currentPage(), HIRES_PDF_SCALE);
    } else {
      const img = this.previewImg;
      if (!img.complete || !img.naturalWidth) return null;
      const k = Math.min(1, HIRES_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * k);
      canvas.height = Math.round(img.naturalHeight * k);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; // 透明 PNG 轉 JPEG 時不要變黑底
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    if (state.isCurrentPageWatermarked()) {
      this.exportService.applyWatermarkToCanvas(
        canvas.getContext('2d')!,
        canvas.width,
        canvas.height,
        state.getParams()
      );
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    canvas.width = canvas.height = 0;
    return blob ? URL.createObjectURL(blob) : null;
  }

  // ---------- 全螢幕縮放手勢 ----------

  zoomTransform(): string {
    return toTransform(this.zoom());
  }

  resetZoom() {
    this.zoom.set(INITIAL_ZOOM);
    this.pointers.clear();
    this.pinchPrev = null;
    this.tapCandidate = false;
  }

  private zoomMetrics(area: HTMLElement) {
    const r = area.getBoundingClientRect();
    const img = area.querySelector('img') as HTMLImageElement;
    return {
      view: { w: r.width, h: r.height },
      center: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      content: { w: img.offsetWidth, h: img.offsetHeight },
    };
  }

  onZoomPointerDown(e: PointerEvent) {
    const area = e.currentTarget as HTMLElement;
    try {
      area.setPointerCapture(e.pointerId);
    } catch {}
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchPrev = { dist: distance(a, b), mid: midpoint(a, b) };
      this.tapCandidate = false;
    } else if (this.pointers.size === 1) {
      this.tapCandidate = true;
      this.tapStart = { x: e.clientX, y: e.clientY };
    }
  }

  onZoomPointerMove(e: PointerEvent) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, cur);
    const { view, center, content } = this.zoomMetrics(e.currentTarget as HTMLElement);

    if (this.pointers.size === 2 && this.pinchPrev) {
      const [a, b] = [...this.pointers.values()];
      const dist = distance(a, b);
      const mid = midpoint(a, b);
      if (dist < 1 || this.pinchPrev.dist < 1) return;

      const k = dist / this.pinchPrev.dist;
      const prevFocus = { x: this.pinchPrev.mid.x - center.x, y: this.pinchPrev.mid.y - center.y };
      this.zoom.update((z) => {
        const zoomed = zoomAt(z, z.scale * k, prevFocus, content, view);
        return panBy(zoomed, mid.x - this.pinchPrev!.mid.x, mid.y - this.pinchPrev!.mid.y, content, view);
      });
      this.pinchPrev = { dist, mid };
    } else if (this.pointers.size === 1) {
      if (distance(cur, this.tapStart) > TAP_SLOP_PX) this.tapCandidate = false;
      if (this.zoom().scale > 1) {
        this.zoom.update((z) => panBy(z, cur.x - prev.x, cur.y - prev.y, content, view));
      }
    }
  }

  onZoomPointerUp(e: PointerEvent) {
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    this.pinchPrev = null;

    if (e.type === 'pointerup' && wasSingle && this.tapCandidate) {
      this.handleTap(e);
    }
    this.tapCandidate = false;
  }

  /** 雙擊：放大到 2.5 倍（以點擊處為中心），已放大時則還原 */
  private handleTap(e: PointerEvent) {
    const now = performance.now();
    const last = this.lastTap;
    const isDouble =
      now - last.time < DOUBLE_TAP_MS && distance({ x: e.clientX, y: e.clientY }, { x: last.x, y: last.y }) < 30;

    if (!isDouble) {
      this.lastTap = { time: now, x: e.clientX, y: e.clientY };
      return;
    }
    this.lastTap = { time: 0, x: 0, y: 0 };

    if (this.zoom().scale > 1) {
      this.resetZoom();
      return;
    }
    const { view, center, content } = this.zoomMetrics(e.currentTarget as HTMLElement);
    const focus = { x: e.clientX - center.x, y: e.clientY - center.y };
    this.zoom.update((z) => zoomAt(z, DOUBLE_TAP_SCALE, focus, content, view));
  }

  /** 電腦版：滑鼠滾輪以游標為中心縮放 */
  onZoomWheel(e: WheelEvent) {
    e.preventDefault();
    const { view, center, content } = this.zoomMetrics(e.currentTarget as HTMLElement);
    const focus = { x: e.clientX - center.x, y: e.clientY - center.y };
    const k = Math.exp(-e.deltaY * 0.0015);
    this.zoom.update((z) => zoomAt(z, z.scale * k, focus, content, view));
  }

  onPointerDown(e: any) {
    if (this.stateService.watermarkMode() !== 'single' || !this.stateService.isLoaded()) return;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    this.lastMouseX = clientX;
    this.lastMouseY = clientY;

    if (e.pointerId !== undefined && e.target && e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    const canvas = e.target as HTMLCanvasElement;
    if (!canvas || !canvas.getContext) return; // Ensure it's a canvas

    const layout = this.measureWatermark(canvas);
    if (!layout) return;

    // Hit test
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };

    this.isDragging = isPointOnText(touch, layout.anchor, layout.textW, layout.fontSize);
  }

  onPointerMove(e: any) {
    if (!this.isDragging) return;

    if (e.cancelable && e.type === 'touchmove') e.preventDefault();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dx = clientX - this.lastMouseX;
    const dy = clientY - this.lastMouseY;
    
    this.lastMouseX = clientX;
    this.lastMouseY = clientY;

    const canvas = e.target as HTMLCanvasElement;
    if (!canvas || !canvas.getContext) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const layout = this.measureWatermark(canvas);
    if (!layout) return;

    // Constrain the entire text to stay within the canvas
    const moved = clampAnchorToCanvas(
      { x: layout.anchor.x + dx * scaleX, y: layout.anchor.y + dy * scaleY },
      canvas.width,
      canvas.height,
      layout.textW,
      layout.fontSize
    );

    this.stateService.watermarkCustomPos.set({ x: moved.x / canvas.width, y: moved.y / canvas.height });
  }

  /** 以目前參數量測浮水印文字，回傳它在畫布上的中心點與尺寸；與匯出共用同一套計算 */
  private measureWatermark(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const p = this.stateService.getParams();
    const fontSize = getFontSize(canvas.width, p.size);
    ctx.font = getFontCss(fontSize, p.font);
    const textW = ctx.measureText(p.text).width;
    const anchor = getSingleAnchor(canvas.width, canvas.height, fontSize, textW, p.pos, p.customPos);
    return { anchor, textW, fontSize };
  }

  onPointerUp(e?: any) {
    this.isDragging = false;
    if (e && e.pointerId !== undefined && e.target && e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  }

  initEmptyCanvas() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 600;
    canvas.height = 800;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 600, 800);
  }

  constructor() {
    effect(() => {
      const src = this.stateService.previewImageSrc();
      if (src) {
        // Prevent flashing the old image by clearing the canvas buffer immediately
        if (this.canvasRef && this.canvasRef.nativeElement) {
           const canvas = this.canvasRef.nativeElement;
           const ctx = canvas.getContext('2d');
           if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        this.previewImg.onload = () => {
          this.drawCanvas();
        };
        this.previewImg.src = src;
      }
    });

    effect(() => {
      const params = this.stateService.getParams();
      this.stateService.isCurrentPageWatermarked(); // 頁面範圍改變時要重畫
      if (this.stateService.isLoaded() && this.previewImg.src) {
        requestAnimationFrame(() => this.drawCanvas());
      }
    });
  }

  prevPage() {
    this.goToPage(this.stateService.currentPage() - 1);
  }

  nextPage() {
    this.goToPage(this.stateService.currentPage() + 1);
  }

  async goToPage(page: number) {
    const state = this.stateService;
    if (page < 1 || page > state.pageCount() || page === state.currentPage()) return;
    const file = state.files()[state.activeIndex()];
    if (!file) return;

    const fileIndex = state.activeIndex();
    state.currentPage.set(page);
    this.isPageLoading.set(true);
    this.pageError.set(false);
    try {
      const url = await this.pdfPreview.renderPage(file, page);
      // 渲染期間若使用者又翻頁或換檔案，就丟棄這次結果
      if (state.currentPage() === page && state.activeIndex() === fileIndex) {
        state.previewImageSrc.set(url);
      }
    } catch (e) {
      console.error(e);
      if (state.currentPage() === page) this.pageError.set(true);
    } finally {
      if (state.currentPage() === page) this.isPageLoading.set(false);
    }
  }

  prevImage() {
      const idx = this.stateService.activeIndex();
      if (idx > 0) {
        this.stateService.switchFile(idx - 1);
      }
    }

    nextImage() {
      const idx = this.stateService.activeIndex();
      if (idx < this.stateService.files().length - 1) {
        this.stateService.switchFile(idx + 1);
      }
    }

    drawCanvas() {
      if (!this.canvasRef) {
        if (this.stateService.isLoaded()) {
          setTimeout(() => this.drawCanvas(), 50);
        }
        return;
      }
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Ensure the image is fully loaded before attempting to draw.
      // If width is 0, setting canvas.width = 0 will clear the canvas and make it disappear.
      if (!this.previewImg || !this.previewImg.complete || this.previewImg.width === 0) {
        return;
      }

      const maxDisplayW = 800;
      let scale = 1;
      if (this.previewImg.width > maxDisplayW) scale = maxDisplayW / this.previewImg.width;

      canvas.width = this.previewImg.width * scale;
      canvas.height = this.previewImg.height * scale;

      ctx.drawImage(this.previewImg, 0, 0, canvas.width, canvas.height);

      if (this.stateService.isCurrentPageWatermarked()) {
        this.exportService.applyWatermarkToCanvas(ctx, canvas.width, canvas.height, this.stateService.getParams());
      }
    }
  }
