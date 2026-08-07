import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { WatermarkStateService, WatermarkParams } from '../../../services/watermark-state.service';
import { SafeZoneBoxComponent } from '../safe-zone-box/safe-zone-box';

@Component({
  selector: 'app-preview-pane',
  standalone: true,
  imports: [SafeZoneBoxComponent],
  templateUrl: './preview-pane.html'
})
export class PreviewPaneComponent {
  stateService = inject(WatermarkStateService);
  @ViewChild('previewCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private previewImg = new Image();

  constructor() {
    // React to image source change
    effect(() => {
      const src = this.stateService.previewImageSrc();
      if (src) {
        this.previewImg.src = src;
        this.previewImg.onload = () => {
          this.drawCanvas();
        };
      }
    });

    // React to any other state changes to redraw
    effect(() => {
      // Accessing getter to track all params
      const params = this.stateService.getParams();
      if (this.stateService.isLoaded() && this.previewImg.src) {
        // use requestAnimationFrame to ensure canvas is ready
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

    this.applyWatermarkToCanvas(ctx, canvas.width, canvas.height, this.stateService.getParams());
  }

  applyWatermarkToCanvas(targetCtx: CanvasRenderingContext2D, width: number, height: number, p: WatermarkParams) {
    const basePx = width / 20;
    const fontSize = basePx * (p.size / 50);

    targetCtx.save();

    // 如果有遮罩，定義裁切區域
    if (p.mask) {
      targetCtx.beginPath();
      // 1. 畫出整個畫布矩形
      targetCtx.rect(0, 0, width, height);

      // 2. 畫出遮罩矩形
      const mx = p.mask.x * width;
      const my = p.mask.y * height;
      const mw = p.mask.w * width;
      const mh = p.mask.h * height;
      targetCtx.rect(mx, my, mw, mh);

      // 3. 使用 evenodd 規則：兩個矩形重疊處會變成"洞" (不繪製)
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

      if (h === 'left') x = margin + textW / 2;
      else if (h === 'right') x = width - margin - textW / 2;
      else x = width / 2;

      if (v === 'top') y = margin + fontSize / 2;
      else if (v === 'bottom') y = height - margin - fontSize / 2;
      else y = height / 2;

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
          let y = j * gapPx;
          let xOffset = (j % 2 !== 0) ? gapPx / 2 : 0;
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
}
