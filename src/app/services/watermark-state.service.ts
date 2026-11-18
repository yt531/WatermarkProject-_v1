import { Injectable, signal, computed } from '@angular/core';
import { parsePageRange } from './page-range';

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
  mode: 'single' | 'tiled';
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

  // PDF 分頁（每個檔案的總頁數；非 PDF 為 1）
  filePageCounts = signal<number[]>([]);
  currentPage = signal<number>(1);
  pageCount = computed(() => this.filePageCounts()[this.activeIndex()] ?? 1);

  // PDF 專用設定
  pageRange = signal<string>(''); // 空字串 = 全部頁
  exportScale = signal<number>(2); // PDF 轉圖片 / 浮水印圖層的解析度倍率
  
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
  hasPdf = computed(() => this.files().some((f) => f.type === 'application/pdf'));
  activeIsPdf = computed(() => this.files()[this.activeIndex()]?.type === 'application/pdf');
  pageRangeResult = computed(() => parsePageRange(this.pageRange(), this.pageCount()));
  pageRangeError = computed(() => {
    const r = this.pageRangeResult();
    return this.hasPdf() && 'error' in r ? r.error : null;
  });
  /** 目前預覽的這一頁會不會被加上浮水印（範圍有誤時當作全部頁） */
  isCurrentPageWatermarked = computed(() => {
    if (!this.activeIsPdf()) return true;
    const r = this.pageRangeResult();
    return 'error' in r || r.pages.includes(this.currentPage());
  });

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
      customPos: this.watermarkCustomPos(),
      mode: this.watermarkMode()
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
    this.currentPage.set(1);
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
