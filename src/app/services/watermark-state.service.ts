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
  customPos: {x: number, y: number} | null;
}

@Injectable({
  providedIn: 'root'
})
export class WatermarkStateService {
  // 來源檔案與預覽
  files = signal<File[]>([]);
  filePreviews = signal<string[]>([]);
  previewImageSrc = signal<string | null>(null);
  activeIndex = signal<number>(0);
  
  // 狀態套用模式
  applyMode = signal<'unified' | 'independent'>('unified');
  savedParams = signal<WatermarkParams[]>([]);

  // 模式設定
  usageMode = signal<'general' | 'idcard'>('general');
  watermarkMode = signal<'single' | 'tiled'>('single');

  // 浮水印參數
  watermarkText = signal<string>('機密 CONFIDENTIAL');
  watermarkFont = signal<string>('Arial');
  previewFont = signal<string | null>(null);
  watermarkColor = signal<string>('#FF0000');
  watermarkSize = signal<number>(50);
  watermarkRotate = signal<number>(335);
  watermarkOpacity = signal<number>(40); // 0-100% in UI, converted to 0-1 in drawing
  
  // 位置與間距
  watermarkPos = signal<string>('middle-center');
  watermarkCustomPos = signal<{x: number, y: number} | null>(null);
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
      font: this.previewFont() || this.watermarkFont(),
      color: this.watermarkColor(),
      size: this.watermarkSize(),
      rotate: this.watermarkRotate(),
      opacity: this.watermarkOpacity() / 100, // convert 0-100 to 0-1
      gap: this.watermarkGap(),
      pos: this.watermarkPos(),
      mask: this.isIdCardMode() ? this.safeZoneMask() : null,
      customPos: this.watermarkCustomPos()
    };
  }

  saveCurrentParams() {
    const p = this.getParams();
    const arr = [...this.savedParams()];
    arr[this.activeIndex()] = p;
    this.savedParams.set(arr);
  }

  switchFile(index: number) {
    if (index < 0 || index >= this.files().length) return;
    
    if (this.applyMode() === 'independent') {
      this.saveCurrentParams();
      const newParams = this.savedParams()[index];
      if (newParams) {
        this.watermarkText.set(newParams.text);
        this.watermarkFont.set(newParams.font);
        this.watermarkColor.set(newParams.color);
        this.watermarkSize.set(newParams.size);
        this.watermarkRotate.set(newParams.rotate);
        this.watermarkOpacity.set(newParams.opacity * 100);
        this.watermarkGap.set(newParams.gap);
        this.watermarkPos.set(newParams.pos);
        this.safeZoneMask.set(newParams.mask);
        this.watermarkCustomPos.set(newParams.customPos);
      }
    }
    
    this.activeIndex.set(index);
    this.previewImageSrc.set(this.filePreviews()[index] || null);
  }

  toggleApplyMode(mode: 'unified' | 'independent') {
    this.applyMode.set(mode);
    if (mode === 'independent') {
      // 複製當前設定給所有檔案
      const current = this.getParams();
      this.savedParams.set(this.files().map(() => ({ ...current })));
    }
  }
}
