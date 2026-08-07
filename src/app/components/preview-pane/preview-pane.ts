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

  ngAfterViewInit() {
    this.initEmptyCanvas();
  }

  initEmptyCanvas() {
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
