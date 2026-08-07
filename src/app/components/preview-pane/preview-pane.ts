import { Component, ElementRef, ViewChild, effect, inject, AfterViewInit } from '@angular/core';
import { WatermarkStateService, WatermarkParams } from '../../services/watermark-state.service';
import { WatermarkExportService } from '../../services/watermark-export.service';
import { SafeZoneBoxComponent } from '../safe-zone-box/safe-zone-box';

@Component({
  selector: 'app-preview-pane',
  standalone: true,
  imports: [SafeZoneBoxComponent],
  templateUrl: './preview-pane.html'
})
export class PreviewPaneComponent implements AfterViewInit {
  stateService = inject(WatermarkStateService);
  exportService = inject(WatermarkExportService);
  @ViewChild('previewCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private previewImg = new Image();
  isFullscreen = false;
  modalImageSrc = '';

  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  initialWatermarkX = 0;
  initialWatermarkY = 0;

  ngAfterViewInit() {
    this.initEmptyCanvas();
  }

  openFullscreen() {
    if (!this.canvasRef) return;
    this.modalImageSrc = this.canvasRef.nativeElement.toDataURL('image/png');
    this.isFullscreen = true;
  }

  onPointerDown(e: MouseEvent | TouchEvent) {
    if (this.stateService.watermarkMode() !== 'single' || !this.stateService.isLoaded()) return;

    let clientX, clientY;
    if (window.TouchEvent && e instanceof TouchEvent) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    this.dragStartX = clientX;
    this.dragStartY = clientY;

    const p = this.stateService.getParams();
    const canvas = e.target as HTMLCanvasElement;
    if (!canvas || !canvas.getContext) return; // Ensure it's a canvas

    if (p.customPos) {
      this.initialWatermarkX = p.customPos.x;
      this.initialWatermarkY = p.customPos.y;
    } else {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const basePx = canvas.width / 20;
        const fontSize = basePx * (p.size / 50);
        ctx.font = `bold ${fontSize}px "${p.font}"`;
        const textW = ctx.measureText(p.text).width;

        let x = 0, y = 0;
        const parts = p.pos.split('-');
        const v = parts[0];
        const h = parts[1];
        const margin = fontSize;

        if (h === 'left') x = margin + textW / 2;
        else if (h === 'right') x = canvas.width - margin - textW / 2;
        else x = canvas.width / 2;

        if (v === 'top') y = margin + fontSize / 2;
        else if (v === 'bottom') y = canvas.height - margin - fontSize / 2;
        else y = canvas.height / 2;

        this.initialWatermarkX = x;
        this.initialWatermarkY = y;
      }
    }

    // Hit test to allow scrolling on canvas edges
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchX = (clientX - rect.left) * scaleX;
    const touchY = (clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    const basePx = canvas.width / 20;
    const fontSize = basePx * (p.size / 50);
    ctx!.font = `bold ${fontSize}px "${p.font}"`;
    const textW = ctx!.measureText(p.text).width;

    // Hit box: Text width/height + 20px padding (reduced to avoid accidental drags)
    const halfW = (textW / 2) + 20;
    const halfH = (fontSize / 2) + 20;

    // Must hit the text
    if (Math.abs(touchX - this.initialWatermarkX) < halfW && Math.abs(touchY - this.initialWatermarkY) < halfH) {
      this.isDragging = true;
    } else {
      this.isDragging = false;
    }
  }

  onPointerMove(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    if (window.TouchEvent && e instanceof TouchEvent) {
      if (e.cancelable) e.preventDefault();
    }

    let clientX, clientY;
    if (window.TouchEvent && e instanceof TouchEvent) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;

    const canvas = e.target as HTMLCanvasElement;
    if (!canvas || !canvas.getContext) return;

    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;

    const newX = this.initialWatermarkX + dx * scaleX;
    const newY = this.initialWatermarkY + dy * scaleY;

    // Constrain to canvas boundaries
    const p = this.stateService.getParams();
    const ctx = canvas.getContext('2d');
    const basePx = canvas.width / 20;
    const fontSize = basePx * (p.size / 50);
    ctx!.font = `bold ${fontSize}px "${p.font}"`;
    const textW = ctx!.measureText(p.text).width;

    const margin = 10;
    const minX = textW / 2 + margin;
    const maxX = canvas.width - textW / 2 - margin;
    const minY = fontSize / 2 + margin;
    const maxY = canvas.height - fontSize / 2 - margin;

    let clampedX = Math.max(minX, Math.min(newX, maxX));
    let clampedY = Math.max(minY, Math.min(newY, maxY));

    // Handle edge case where text is larger than canvas
    if (minX > maxX) clampedX = canvas.width / 2;
    if (minY > maxY) clampedY = canvas.height / 2;

    this.stateService.watermarkCustomPos.set({ x: clampedX, y: clampedY });
  }

  onPointerUp() {
    this.isDragging = false;
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
        this.previewImg.src = src;
        this.previewImg.onload = () => {
          this.drawCanvas();
        };
      }
    });

    effect(() => {
      const params = this.stateService.getParams();
      if (this.stateService.isLoaded() && this.previewImg.src) {
        requestAnimationFrame(() => this.drawCanvas());
      }
    });
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
      if (!this.canvasRef) return;
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const maxDisplayW = 800;
      let scale = 1;
      if (this.previewImg.width > maxDisplayW) scale = maxDisplayW / this.previewImg.width;

      canvas.width = this.previewImg.width * scale;
      canvas.height = this.previewImg.height * scale;
      ctx.drawImage(this.previewImg, 0, 0, canvas.width, canvas.height);

      this.exportService.applyWatermarkToCanvas(ctx, canvas.width, canvas.height, this.stateService.getParams());
    }
  }
