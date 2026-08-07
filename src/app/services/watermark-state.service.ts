import { Injectable, signal, computed } from '@angular/core';

export interface Mask {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WatermarkParams {
  text: string;
  font: string;
  color: string;
  size: number;
  rotate: number;
  opacity: number;
  gap: number;
  pos: string;
  mask: Mask | null;
}

@Injectable({
  providedIn: 'root'
})
export class WatermarkStateService {
  // 來源檔案與預覽
  files = signal<File[]>([]);
  previewImageSrc = signal<string | null>(null);

  // 模式設定
  usageMode = signal<'general' | 'idcard'>('general');
  watermarkMode = signal<'single' | 'tiled'>('single');

  // 浮水印參數
  watermarkText = signal<string>('機密 CONFIDENTIAL');
  watermarkFont = signal<string>('Arial');
  watermarkColor = signal<string>('#FF0000');
  watermarkSize = signal<number>(50);
  watermarkRotate = signal<number>(335);
  watermarkOpacity = signal<number>(40); // 0-100% in UI, converted to 0-1 in drawing
  
  // 位置與間距
  watermarkPos = signal<string>('middle-center');
  watermarkGap = signal<number>(150);
  safeZoneMask = signal<Mask | null>(null);

  // 匯出相關
  outputFileName = signal<string>('watermarked_output');
  outputFormat = signal<string>('auto');

  // Computed 衍生狀態
  isLoaded = computed(() => this.files().length > 0);
  isIdCardMode = computed(() => this.usageMode() === 'idcard');

  // Helper getters
  getParams(): WatermarkParams {
    return {
      text: this.watermarkText(),
      font: this.watermarkFont(),
      color: this.watermarkColor(),
      size: this.watermarkSize(),
      rotate: this.watermarkRotate(),
      opacity: this.watermarkOpacity() / 100, // convert 0-100 to 0-1
      gap: this.watermarkGap(),
      pos: this.watermarkPos(),
      mask: this.isIdCardMode() ? this.safeZoneMask() : null
    };
  }
}
